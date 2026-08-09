import pool from '../config/db.js'

const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered', 'Cancelled']
const STATUS_TRANSITIONS = { Pending: 'Shipped', Shipped: 'Delivered' }

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const sendDatabaseError = (res, error) => {
  console.error('Order database operation failed:', error.message)
  return res.status(503).json({
    success: false,
    message: 'Database is currently unavailable. Please try again later.',
  })
}

const normalizeItems = (items) => {
  if (!Array.isArray(items) || items.length === 0) return { error: 'Select at least one product.' }

  const quantities = new Map()
  for (const item of items) {
    const productId = validateId(item?.product_id)
    const quantity = Number(item?.quantity)
    if (!productId) return { error: 'Every order item must have a valid product ID.' }
    if (!Number.isInteger(quantity) || quantity <= 0) return { error: 'Every quantity must be a whole number greater than zero.' }
    quantities.set(productId, (quantities.get(productId) || 0) + quantity)
  }

  return { items: [...quantities].map(([productId, quantity]) => ({ productId, quantity })) }
}

const getOrder = async (executor, orderId) => {
  const [orders] = await executor.execute(
    `SELECT o.order_id, o.user_id, o.total_amount, o.order_status, o.shipping_address,
            o.created_at, o.updated_at, o.status,
            CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
            u.email AS customer_email, u.phone AS customer_phone
     FROM orders o
     LEFT JOIN users u ON u.user_id = o.user_id
     WHERE o.order_id = ?`,
    [orderId],
  )
  if (orders.length === 0) return null

  const [items] = await executor.execute(
    `SELECT oi.order_item_id, oi.product_id, p.product_name, p.\`SKU\`,
            oi.quantity, oi.unit_price, oi.subtotal
     FROM order_items oi
     INNER JOIN products p ON p.product_id = oi.product_id
     WHERE oi.order_id = ? ORDER BY oi.order_item_id`,
    [orderId],
  )
  return { ...orders[0], items }
}

export const getOrders = async (req, res) => {
  const requestedStatus = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  if (requestedStatus && !ORDER_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid order status filter.' })
  }

  try {
    let query = `SELECT o.order_id, o.user_id, o.total_amount, o.order_status,
                        o.shipping_address, o.created_at, o.updated_at, o.status,
                        CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
                        u.email AS customer_email,
                        COUNT(oi.order_item_id) AS item_count
                 FROM orders o
                 LEFT JOIN users u ON u.user_id = o.user_id
                 LEFT JOIN order_items oi ON oi.order_id = o.order_id`
    const params = []
    if (requestedStatus) {
      query += ' WHERE o.order_status = ?'
      params.push(requestedStatus)
    }
    query += ` GROUP BY o.order_id, o.user_id, o.total_amount, o.order_status,
                       o.shipping_address, o.created_at, o.updated_at, o.status,
                       u.first_name, u.last_name, u.email
               ORDER BY o.created_at DESC`
    const [orders] = await pool.execute(query, params)
    return res.json({ success: true, data: orders })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const getOrderById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid order ID.' })
  try {
    const order = await getOrder(pool, id)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found.' })
    return res.json({ success: true, data: order })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const createOrder = async (req, res) => {
  const shippingAddress = typeof req.body.shipping_address === 'string' ? req.body.shipping_address.trim() : ''
  const userId = req.body.user_id === undefined || req.body.user_id === null || req.body.user_id === ''
    ? null : validateId(req.body.user_id)
  const normalized = normalizeItems(req.body.items)

  if (!shippingAddress) return res.status(400).json({ success: false, message: 'Shipping address is required.' })
  if (shippingAddress.length > 300) return res.status(400).json({ success: false, message: 'Shipping address cannot exceed 300 characters.' })
  if (req.body.user_id !== undefined && req.body.user_id !== null && req.body.user_id !== '' && !userId) {
    return res.status(400).json({ success: false, message: 'User ID must be a positive whole number.' })
  }
  if (normalized.error) return res.status(400).json({ success: false, message: normalized.error })

  const connection = await pool.getConnection().catch((error) => null)
  if (!connection) return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })

  try {
    await connection.beginTransaction()

    if (userId !== null) {
      const [customers] = await connection.execute(
        'SELECT user_id, status FROM users WHERE user_id = ? FOR UPDATE',
        [userId],
      )
      if (customers.length === 0) {
        await connection.rollback()
        return res.status(404).json({ success: false, message: 'Customer not found.' })
      }
      if (!customers[0].status) {
        await connection.rollback()
        return res.status(409).json({ success: false, message: 'Inactive customers cannot place orders.' })
      }
    }

    const pricedItems = []
    let totalCents = 0

    for (const item of normalized.items) {
      const [products] = await connection.execute(
        `SELECT product_id, product_name, price, inventory_count, status
         FROM products WHERE product_id = ? FOR UPDATE`,
        [item.productId],
      )
      if (products.length === 0) {
        await connection.rollback()
        return res.status(404).json({ success: false, message: `Product ${item.productId} was not found.` })
      }
      const product = products[0]
      if (!product.status) {
        await connection.rollback()
        return res.status(409).json({ success: false, message: `${product.product_name} is inactive and cannot be ordered.` })
      }
      if (item.quantity > Number(product.inventory_count)) {
        await connection.rollback()
        return res.status(409).json({ success: false, message: `Insufficient stock for ${product.product_name}.` })
      }

      const unitPriceCents = Math.round(Number(product.price) * 100)
      const subtotalCents = unitPriceCents * item.quantity
      totalCents += subtotalCents
      pricedItems.push({ ...item, unitPriceCents, subtotalCents })
    }

    if (!Number.isSafeInteger(totalCents) || totalCents < 0 || totalCents > 9999999999) {
      await connection.rollback()
      return res.status(400).json({ success: false, message: 'The calculated order total is invalid or too large.' })
    }

    const totalAmount = (totalCents / 100).toFixed(2)
    const [orderResult] = await connection.execute(
      `INSERT INTO orders (user_id, total_amount, shipping_address)
       VALUES (?, ?, ?)`,
      [userId, totalAmount, shippingAddress],
    )

    for (const item of pricedItems) {
      await connection.execute(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price, subtotal)
         VALUES (?, ?, ?, ?, ?)`,
        [orderResult.insertId, item.productId, item.quantity, (item.unitPriceCents / 100).toFixed(2), (item.subtotalCents / 100).toFixed(2)],
      )
      await connection.execute(
        'UPDATE products SET inventory_count = inventory_count - ? WHERE product_id = ?',
        [item.quantity, item.productId],
      )
    }

    await connection.commit()
    const order = await getOrder(connection, orderResult.insertId)
    return res.status(201).json({ success: true, message: 'Order created successfully', data: order })
  } catch (error) {
    await connection.rollback()
    return sendDatabaseError(res, error)
  } finally {
    connection.release()
  }
}

export const updateOrderStatus = async (req, res) => {
  const id = validateId(req.params.id)
  const nextStatus = typeof req.body.order_status === 'string' ? req.body.order_status.trim() : ''
  if (!id) return res.status(400).json({ success: false, message: 'Invalid order ID.' })
  if (!ORDER_STATUSES.includes(nextStatus) || nextStatus === 'Cancelled') {
    return res.status(400).json({ success: false, message: 'Status must be Pending, Shipped, or Delivered. Use the cancellation endpoint to cancel.' })
  }

  try {
    const [rows] = await pool.execute('SELECT order_status FROM orders WHERE order_id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Order not found.' })
    const currentStatus = rows[0].order_status
    if (STATUS_TRANSITIONS[currentStatus] !== nextStatus) {
      return res.status(409).json({ success: false, message: `Order status cannot change from ${currentStatus} to ${nextStatus}.` })
    }
    await pool.execute('UPDATE orders SET order_status = ? WHERE order_id = ?', [nextStatus, id])
    return res.json({ success: true, message: `Order marked as ${nextStatus}.` })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const cancelOrder = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid order ID.' })

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [orders] = await connection.execute('SELECT order_status FROM orders WHERE order_id = ? FOR UPDATE', [id])
    if (orders.length === 0) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: 'Order not found.' })
    }
    if (orders[0].order_status !== 'Pending') {
      await connection.rollback()
      return res.status(409).json({ success: false, message: `A ${orders[0].order_status.toLowerCase()} order cannot be cancelled.` })
    }

    const [items] = await connection.execute('SELECT product_id, quantity FROM order_items WHERE order_id = ? FOR UPDATE', [id])
    for (const item of items) {
      await connection.execute(
        'UPDATE products SET inventory_count = inventory_count + ? WHERE product_id = ?',
        [item.quantity, item.product_id],
      )
    }
    await connection.execute(
      "UPDATE orders SET order_status = 'Cancelled', status = FALSE WHERE order_id = ?",
      [id],
    )
    await connection.commit()
    return res.json({ success: true, message: 'Order cancelled and inventory restored.' })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally {
    if (connection) connection.release()
  }
}
