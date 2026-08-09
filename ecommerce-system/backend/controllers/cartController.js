import pool from '../config/db.js'
import { addProductToCart, CartOperationError } from '../services/cartOperations.js'

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const validateQuantity = (value) => {
  const quantity = Number(value)
  return Number.isInteger(quantity) && quantity > 0 ? quantity : null
}

const calculateTotal = (price, quantity) => {
  const priceCents = Math.round(Number(price) * 100)
  const totalCents = priceCents * quantity
  if (!Number.isSafeInteger(priceCents) || priceCents < 0 || !Number.isSafeInteger(totalCents) || totalCents > 9999999999) return null
  return (totalCents / 100).toFixed(2)
}

const sendDatabaseError = (res, error) => {
  console.error('Cart database operation failed:', error.message)
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(404).json({ success: false, message: 'The selected customer or product does not exist.' })
  }
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}

const cartSelect = `
  SELECT c.cart_id, c.customer_id,
         CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
         c.product_id, p.product_name, p.price AS product_price,
         p.inventory_count, p.status AS product_status,
         c.quantity, c.total_price, c.created_at, c.updated_at
  FROM carts c
  INNER JOIN users u ON u.user_id = c.customer_id
  INNER JOIN products p ON p.product_id = c.product_id
`

export const getCarts = async (req, res) => {
  try {
    const [items] = await pool.execute(`${cartSelect} ORDER BY c.updated_at DESC`)
    return res.json({ success: true, data: items })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getCustomerCart = async (req, res) => {
  const customerId = validateId(req.params.customerId)
  if (!customerId) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  try {
    const [customers] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [customerId])
    if (customers.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    const [items] = await pool.execute(`${cartSelect} WHERE c.customer_id = ? ORDER BY c.updated_at DESC`, [customerId])
    return res.json({ success: true, data: items })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getCartById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid cart ID.' })
  try {
    const [items] = await pool.execute(`${cartSelect} WHERE c.cart_id = ?`, [id])
    if (items.length === 0) return res.status(404).json({ success: false, message: 'Cart item not found.' })
    return res.json({ success: true, data: items[0] })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const addToCart = async (req, res) => {
  const customerId = validateId(req.body.customer_id)
  const productId = validateId(req.body.product_id)
  const quantity = validateQuantity(req.body.quantity)
  if (!customerId) return res.status(400).json({ success: false, message: 'A valid customer is required.' })
  if (!productId) return res.status(400).json({ success: false, message: 'A valid product is required.' })
  if (!quantity) return res.status(400).json({ success: false, message: 'Quantity must be a whole number greater than zero.' })

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const result = await addProductToCart(connection, { customerId, productId, quantity })
    await connection.commit()
    return res.status(result.updatedExisting ? 200 : 201).json({
      success: true,
      message: result.updatedExisting ? 'Cart quantity updated successfully.' : 'Product added to cart successfully.',
      data: { cart_id: result.cartId, quantity: result.quantity, total_price: result.totalPrice },
    })
  } catch (error) {
    if (connection) await connection.rollback()
    if (error instanceof CartOperationError) return res.status(error.status).json({ success: false, message: error.message })
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}

export const updateCart = async (req, res) => {
  const id = validateId(req.params.id)
  const quantity = validateQuantity(req.body.quantity)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid cart ID.' })
  if (!quantity) return res.status(400).json({ success: false, message: 'Quantity must be a whole number greater than zero.' })
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [items] = await connection.execute('SELECT cart_id, customer_id, product_id FROM carts WHERE cart_id = ? FOR UPDATE', [id])
    if (items.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Cart item not found.' }) }
    const [customers] = await connection.execute('SELECT status FROM users WHERE user_id = ? FOR UPDATE', [items[0].customer_id])
    if (!customers[0]?.status) { await connection.rollback(); return res.status(409).json({ success: false, message: 'An inactive customer cart cannot be updated.' }) }
    const [products] = await connection.execute('SELECT product_name, price, inventory_count, status FROM products WHERE product_id = ? FOR UPDATE', [items[0].product_id])
    if (products.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Product not found.' }) }
    const product = products[0]
    if (!product.status) { await connection.rollback(); return res.status(409).json({ success: false, message: 'An inactive product cart item cannot be updated.' }) }
    if (quantity > Number(product.inventory_count)) { await connection.rollback(); return res.status(409).json({ success: false, message: `Only ${product.inventory_count} unit(s) of ${product.product_name} are available.` }) }
    const totalPrice = calculateTotal(product.price, quantity)
    if (totalPrice === null) { await connection.rollback(); return res.status(400).json({ success: false, message: 'The calculated cart total is invalid or too large.' }) }
    await connection.execute('UPDATE carts SET quantity = ?, total_price = ? WHERE cart_id = ?', [quantity, totalPrice, id])
    await connection.commit()
    return res.json({ success: true, message: 'Cart item updated successfully.', data: { cart_id: id, quantity, total_price: totalPrice } })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}

export const removeCart = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid cart ID.' })
  try {
    const [result] = await pool.execute('DELETE FROM carts WHERE cart_id = ?', [id])
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Cart item not found.' })
    return res.json({ success: true, message: 'Cart item removed successfully. Product inventory was unchanged.' })
  } catch (error) { return sendDatabaseError(res, error) }
}
