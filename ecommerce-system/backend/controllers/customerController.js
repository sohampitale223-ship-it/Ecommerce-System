import pool from '../config/db.js'

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^\+?[0-9][0-9\s()-]{6,14}$/

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const validateCustomer = (body = {}) => {
  const firstName = typeof body.first_name === 'string' ? body.first_name.trim() : ''
  const lastName = typeof body.last_name === 'string' ? body.last_name.trim() : ''
  const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
  const phone = typeof body.phone === 'string' ? body.phone.trim() : ''

  if (!firstName) return { error: 'First name is required.' }
  if (!lastName) return { error: 'Last name is required.' }
  if (!email) return { error: 'Email is required.' }
  if (!phone) return { error: 'Phone is required.' }
  if (firstName.length > 100) return { error: 'First name cannot exceed 100 characters.' }
  if (lastName.length > 100) return { error: 'Last name cannot exceed 100 characters.' }
  if (email.length > 100 || !EMAIL_PATTERN.test(email)) return { error: 'Enter a valid email address.' }
  if (phone.length > 15 || !PHONE_PATTERN.test(phone)) return { error: 'Enter a valid phone number between 7 and 15 characters.' }

  let status
  if (body.status !== undefined) {
    if (![true, false, 1, 0, '1', '0'].includes(body.status)) return { error: 'Status must be active or inactive.' }
    status = body.status === true || body.status === 1 || body.status === '1'
  }
  return { firstName, lastName, email, phone, status }
}

const sendDatabaseError = (res, error) => {
  console.error('Customer database operation failed:', error.message)
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A customer with this email already exists.' })
  }
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}

const customerSelect = `
  SELECT u.user_id, u.first_name, u.last_name,
         CONCAT(u.first_name, ' ', u.last_name) AS full_name,
         u.email, u.phone, u.created_at, u.updated_at, u.status,
         COUNT(o.order_id) AS order_count
  FROM users u
  LEFT JOIN orders o ON o.user_id = u.user_id
`

export const getCustomers = async (req, res) => {
  try {
    const [customers] = await pool.execute(`${customerSelect}
      GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.phone, u.created_at, u.updated_at, u.status
      ORDER BY u.created_at DESC`)
    return res.json({ success: true, data: customers })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getCustomerById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  try {
    const [rows] = await pool.execute(`${customerSelect} WHERE u.user_id = ?
      GROUP BY u.user_id, u.first_name, u.last_name, u.email, u.phone, u.created_at, u.updated_at, u.status`, [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    return res.json({ success: true, data: rows[0] })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getCustomerOrders = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  try {
    const [customers] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [id])
    if (customers.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    const [orders] = await pool.execute(`
      SELECT o.order_id, o.total_amount, o.order_status, o.shipping_address,
             o.created_at, o.updated_at, o.status, COUNT(oi.order_item_id) AS item_count
      FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.user_id = ?
      GROUP BY o.order_id, o.total_amount, o.order_status, o.shipping_address, o.created_at, o.updated_at, o.status
      ORDER BY o.created_at DESC`, [id])
    return res.json({ success: true, data: orders })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const createCustomer = async (req, res) => {
  const validation = validateCustomer(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })
  try {
    const [result] = await pool.execute(
      'INSERT INTO users (first_name, last_name, email, phone) VALUES (?, ?, ?, ?)',
      [validation.firstName, validation.lastName, validation.email, validation.phone],
    )
    return res.status(201).json({ success: true, message: 'Customer created successfully', data: { user_id: result.insertId } })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const updateCustomer = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  const validation = validateCustomer(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })
  try {
    const [existing] = await pool.execute('SELECT user_id, status FROM users WHERE user_id = ?', [id])
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    const status = validation.status === undefined ? Boolean(existing[0].status) : validation.status
    await pool.execute('UPDATE users SET first_name = ?, last_name = ?, email = ?, phone = ?, status = ? WHERE user_id = ?',
      [validation.firstName, validation.lastName, validation.email, validation.phone, status, id])
    return res.json({ success: true, message: 'Customer updated successfully' })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const deactivateCustomer = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  try {
    const [rows] = await pool.execute('SELECT user_id, status FROM users WHERE user_id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    if (!rows[0].status) return res.status(409).json({ success: false, message: 'Customer is already inactive.' })
    await pool.execute('UPDATE users SET status = FALSE WHERE user_id = ?', [id])
    return res.json({ success: true, message: 'Customer deactivated successfully. Order history was preserved.' })
  } catch (error) { return sendDatabaseError(res, error) }
}
