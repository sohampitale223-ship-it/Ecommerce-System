import pool from '../config/db.js'

const PAYMENT_METHODS = ['Card', 'PayPal', 'Bank Transfer']
const PAYMENT_STATUSES = ['Paid', 'Failed', 'Refunded']
const SIMULATED_OUTCOMES = ['Paid', 'Failed']

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const sendDatabaseError = (res, error) => {
  console.error('Payment database operation failed:', error.message)
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(404).json({ success: false, message: 'The selected order does not exist.' })
  }
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}

const paymentSelect = `
  SELECT p.payment_id, p.order_id, o.user_id,
         COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Guest') AS customer_name,
         p.amount, p.payment_method, p.payment_status,
         o.order_status, p.created_at, p.updated_at
  FROM payments p
  INNER JOIN orders o ON o.order_id = p.order_id
  LEFT JOIN users u ON u.user_id = o.user_id
`

export const getPayments = async (req, res) => {
  const requestedStatus = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  if (requestedStatus && !PAYMENT_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid payment status filter.' })
  }
  try {
    const where = requestedStatus ? ' WHERE p.payment_status = ?' : ''
    const [payments] = await pool.execute(`${paymentSelect}${where} ORDER BY p.created_at DESC`, requestedStatus ? [requestedStatus] : [])
    return res.json({ success: true, data: payments })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getPaymentById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid payment ID.' })
  try {
    const [payments] = await pool.execute(`${paymentSelect} WHERE p.payment_id = ?`, [id])
    if (payments.length === 0) return res.status(404).json({ success: false, message: 'Payment not found.' })
    const [history] = await pool.execute(`
      SELECT history_id, previous_status, new_status, reason, created_at
      FROM payment_status_history WHERE payment_id = ? ORDER BY created_at DESC, history_id DESC`, [id])
    return res.json({ success: true, data: { ...payments[0], history } })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const createPayment = async (req, res) => {
  const orderId = validateId(req.body.order_id)
  const paymentMethod = typeof req.body.payment_method === 'string' ? req.body.payment_method.trim() : ''
  const simulatedStatus = typeof req.body.simulated_status === 'string' ? req.body.simulated_status.trim() : 'Paid'
  if (!orderId) return res.status(400).json({ success: false, message: 'A valid order is required.' })
  if (!PAYMENT_METHODS.includes(paymentMethod)) return res.status(400).json({ success: false, message: 'Payment method must be Card, PayPal, or Bank Transfer.' })
  if (!SIMULATED_OUTCOMES.includes(simulatedStatus)) return res.status(400).json({ success: false, message: 'Simulated outcome must be Paid or Failed.' })

  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [orders] = await connection.execute(
      'SELECT order_id, total_amount, order_status FROM orders WHERE order_id = ? FOR UPDATE', [orderId],
    )
    if (orders.length === 0) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: 'Order not found.' })
    }
    const order = orders[0]
    if (Number(order.total_amount) <= 0) {
      await connection.rollback()
      return res.status(409).json({ success: false, message: 'This order does not have a positive payable total.' })
    }
    if (order.order_status === 'Cancelled') {
      await connection.rollback()
      return res.status(409).json({ success: false, message: 'A cancelled order cannot receive a new payment.' })
    }
    const [paidPayments] = await connection.execute(
      "SELECT payment_id FROM payments WHERE order_id = ? AND payment_status = 'Paid' LIMIT 1", [orderId],
    )
    if (paidPayments.length > 0) {
      await connection.rollback()
      return res.status(409).json({ success: false, message: 'This order already has a successful payment.' })
    }

    const [result] = await connection.execute(
      'INSERT INTO payments (order_id, amount, payment_method, payment_status) VALUES (?, ?, ?, ?)',
      [orderId, order.total_amount, paymentMethod, simulatedStatus],
    )
    await connection.execute(
      'INSERT INTO payment_status_history (payment_id, previous_status, new_status, reason) VALUES (?, NULL, ?, ?)',
      [result.insertId, simulatedStatus, 'Simulated payment attempt'],
    )
    await connection.commit()
    return res.status(201).json({
      success: true,
      message: simulatedStatus === 'Paid' ? 'Simulated payment processed successfully.' : 'Simulated payment failure recorded.',
      data: { payment_id: result.insertId, amount: order.total_amount, payment_status: simulatedStatus },
    })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}

export const refundPayment = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid payment ID.' })
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [payments] = await connection.execute(`
      SELECT p.payment_id, p.payment_status, o.order_status
      FROM payments p INNER JOIN orders o ON o.order_id = p.order_id
      WHERE p.payment_id = ? FOR UPDATE`, [id])
    if (payments.length === 0) {
      await connection.rollback()
      return res.status(404).json({ success: false, message: 'Payment not found.' })
    }
    const payment = payments[0]
    if (payment.payment_status !== 'Paid') {
      await connection.rollback()
      return res.status(409).json({ success: false, message: `A ${payment.payment_status.toLowerCase()} payment cannot be refunded.` })
    }
    if (payment.order_status !== 'Cancelled') {
      await connection.rollback()
      return res.status(409).json({ success: false, message: 'Only payments for cancelled orders can currently be refunded.' })
    }
    await connection.execute("UPDATE payments SET payment_status = 'Refunded' WHERE payment_id = ?", [id])
    await connection.execute(
      "INSERT INTO payment_status_history (payment_id, previous_status, new_status, reason) VALUES (?, 'Paid', 'Refunded', ?)",
      [id, 'Refund for cancelled order'],
    )
    await connection.commit()
    return res.json({ success: true, message: 'Payment refunded successfully. The payment record was preserved.' })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}
