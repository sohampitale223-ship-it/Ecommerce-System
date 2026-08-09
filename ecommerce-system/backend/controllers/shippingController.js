import pool from '../config/db.js'
import { calculateShippingCost, SHIPPING_STATUSES, SHIPPING_TRANSITIONS } from '../services/shippingOperations.js'

const COURIER_PATTERN = /^[A-Za-z0-9][A-Za-z0-9 .&'()-]{0,99}$/
const TRACKING_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._/-]{0,99}$/

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const validateShippingDetails = (body = {}) => {
  const courierService = typeof body.courier_service === 'string' ? body.courier_service.trim() : ''
  const trackingNumber = typeof body.tracking_number === 'string' ? body.tracking_number.trim() : ''
  if (!courierService) return { error: 'Courier service is required.' }
  if (courierService.length > 100 || !COURIER_PATTERN.test(courierService)) return { error: 'Enter a valid courier service up to 100 characters.' }
  if (trackingNumber && (trackingNumber.length > 100 || !TRACKING_PATTERN.test(trackingNumber))) return { error: 'Tracking number may contain letters, numbers, dots, underscores, slashes, and hyphens, up to 100 characters.' }
  return { courierService, trackingNumber: trackingNumber || null }
}

const sendDatabaseError = (res, error) => {
  console.error('Shipping database operation failed:', error.message)
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This order already has shipping information or the tracking number is already in use.' })
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(404).json({ success: false, message: 'The selected order does not exist.' })
  }
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}

const shippingSelect = `
  SELECT s.shipping_id, s.order_id, o.user_id,
         COALESCE(CONCAT(u.first_name, ' ', u.last_name), 'Guest') AS customer_name,
         o.order_status, o.total_amount AS order_total,
         s.courier_service, s.tracking_number, s.shipping_status,
         s.shipping_cost, s.created_at, s.updated_at
  FROM shipping s
  INNER JOIN orders o ON o.order_id = s.order_id
  LEFT JOIN users u ON u.user_id = o.user_id
`

export const getShipping = async (req, res) => {
  const requestedStatus = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  if (requestedStatus && !SHIPPING_STATUSES.includes(requestedStatus)) {
    return res.status(400).json({ success: false, message: 'Invalid shipping status filter.' })
  }
  try {
    const where = requestedStatus ? ' WHERE s.shipping_status = ?' : ''
    const [records] = await pool.execute(`${shippingSelect}${where} ORDER BY s.created_at DESC`, requestedStatus ? [requestedStatus] : [])
    return res.json({ success: true, data: records })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getShippingById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid shipping ID.' })
  try {
    const [records] = await pool.execute(`${shippingSelect} WHERE s.shipping_id = ?`, [id])
    if (records.length === 0) return res.status(404).json({ success: false, message: 'Shipping record not found.' })
    return res.json({ success: true, data: records[0] })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const createShipping = async (req, res) => {
  const orderId = validateId(req.body.order_id)
  if (!orderId) return res.status(400).json({ success: false, message: 'A valid order is required.' })
  const validation = validateShippingDetails(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [orders] = await connection.execute('SELECT order_id, total_amount, order_status FROM orders WHERE order_id = ? FOR UPDATE', [orderId])
    if (orders.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Order not found.' }) }
    if (['Cancelled', 'Delivered'].includes(orders[0].order_status)) { await connection.rollback(); return res.status(409).json({ success: false, message: `A ${orders[0].order_status.toLowerCase()} order is not eligible for new shipping information.` }) }
    const [existing] = await connection.execute('SELECT shipping_id FROM shipping WHERE order_id = ? FOR UPDATE', [orderId])
    if (existing.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'This order already has a shipping record.' }) }
    if (validation.trackingNumber) {
      const [tracking] = await connection.execute('SELECT shipping_id FROM shipping WHERE tracking_number = ? LIMIT 1', [validation.trackingNumber])
      if (tracking.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'This tracking number is already in use.' }) }
    }
    const shippingCost = calculateShippingCost(orders[0].total_amount)
    if (shippingCost === null) { await connection.rollback(); return res.status(400).json({ success: false, message: 'The order total cannot produce a valid shipping cost.' }) }
    const [result] = await connection.execute(
      'INSERT INTO shipping (order_id, courier_service, tracking_number, shipping_cost) VALUES (?, ?, ?, ?)',
      [orderId, validation.courierService, validation.trackingNumber, shippingCost],
    )
    await connection.commit()
    return res.status(201).json({ success: true, message: 'Shipping information created successfully.', data: { shipping_id: result.insertId, shipping_cost: shippingCost, shipping_status: 'Pending' } })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}

export const updateShipping = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid shipping ID.' })
  const validation = validateShippingDetails(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })
  try {
    const [records] = await pool.execute('SELECT shipping_id, shipping_status FROM shipping WHERE shipping_id = ?', [id])
    if (records.length === 0) return res.status(404).json({ success: false, message: 'Shipping record not found.' })
    if (records[0].shipping_status === 'Delivered') return res.status(409).json({ success: false, message: 'Delivered shipping information is completed and cannot be edited.' })
    if (validation.trackingNumber) {
      const [tracking] = await pool.execute('SELECT shipping_id FROM shipping WHERE tracking_number = ? AND shipping_id <> ?', [validation.trackingNumber, id])
      if (tracking.length) return res.status(409).json({ success: false, message: 'This tracking number is already in use.' })
    }
    await pool.execute('UPDATE shipping SET courier_service = ?, tracking_number = ? WHERE shipping_id = ?', [validation.courierService, validation.trackingNumber, id])
    return res.json({ success: true, message: 'Shipping information updated successfully.' })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const updateShippingStatus = async (req, res) => {
  const id = validateId(req.params.id)
  const nextStatus = typeof req.body.shipping_status === 'string' ? req.body.shipping_status.trim() : ''
  if (!id) return res.status(400).json({ success: false, message: 'Invalid shipping ID.' })
  if (!SHIPPING_STATUSES.includes(nextStatus)) return res.status(400).json({ success: false, message: 'Invalid shipping status.' })
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [records] = await connection.execute(`
      SELECT s.shipping_status, s.order_id, o.order_status
      FROM shipping s INNER JOIN orders o ON o.order_id = s.order_id
      WHERE s.shipping_id = ? FOR UPDATE`, [id])
    if (records.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Shipping record not found.' }) }
    const record = records[0]
    if (SHIPPING_TRANSITIONS[record.shipping_status] !== nextStatus) {
      await connection.rollback()
      return res.status(409).json({ success: false, message: `Shipping status cannot change from ${record.shipping_status} to ${nextStatus}.` })
    }
    await connection.execute('UPDATE shipping SET shipping_status = ? WHERE shipping_id = ?', [nextStatus, id])
    let orderSynchronized = false
    if (nextStatus === 'Delivered' && record.order_status === 'Shipped') {
      await connection.execute("UPDATE orders SET order_status = 'Delivered' WHERE order_id = ?", [record.order_id])
      orderSynchronized = true
    }
    await connection.commit()
    return res.json({ success: true, message: orderSynchronized ? 'Shipment delivered and the shipped order was marked Delivered.' : `Shipping status updated to ${nextStatus}.`, data: { shipping_status: nextStatus, order_synchronized: orderSynchronized } })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}
