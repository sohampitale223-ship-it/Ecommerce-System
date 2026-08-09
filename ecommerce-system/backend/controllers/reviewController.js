import pool from '../config/db.js'

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const validateReview = (body = {}) => {
  const rating = Number(body.rating)
  const reviewText = typeof body.review_text === 'string' ? body.review_text.trim() : ''
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) return { error: 'Rating must be a whole number between 1 and 5.' }
  if (!reviewText) return { error: 'Review text is required.' }
  if (reviewText.length > 1000) return { error: 'Review text cannot exceed 1000 characters.' }
  return { rating, reviewText }
}

const sendDatabaseError = (res, error) => {
  console.error('Review database operation failed:', error.message)
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'This customer has already reviewed this product.' })
  if (error.code === 'ER_NO_REFERENCED_ROW_2') return res.status(404).json({ success: false, message: 'The selected customer or product does not exist.' })
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}

const reviewSelect = `
  SELECT r.review_id, r.product_id, p.product_name,
         r.customer_id, CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
         r.rating, r.review_text, r.status, r.created_at, r.updated_at
  FROM reviews r
  INNER JOIN products p ON p.product_id = r.product_id
  INNER JOIN users u ON u.user_id = r.customer_id
`

export const getReviews = async (req, res) => {
  const status = typeof req.query.status === 'string' ? req.query.status.trim().toLowerCase() : ''
  const rating = req.query.rating === undefined || req.query.rating === '' ? null : Number(req.query.rating)
  const productId = req.query.product_id === undefined || req.query.product_id === '' ? null : validateId(req.query.product_id)
  if (status && !['approved', 'pending'].includes(status)) return res.status(400).json({ success: false, message: 'Review status filter must be approved or pending.' })
  if (rating !== null && (!Number.isInteger(rating) || rating < 1 || rating > 5)) return res.status(400).json({ success: false, message: 'Rating filter must be between 1 and 5.' })
  if (req.query.product_id !== undefined && req.query.product_id !== '' && !productId) return res.status(400).json({ success: false, message: 'Invalid product filter.' })
  try {
    const conditions = []; const params = []
    if (status) { conditions.push('r.status = ?'); params.push(status === 'approved') }
    if (rating !== null) { conditions.push('r.rating = ?'); params.push(rating) }
    if (productId) { conditions.push('r.product_id = ?'); params.push(productId) }
    const where = conditions.length ? ` WHERE ${conditions.join(' AND ')}` : ''
    const [reviews] = await pool.execute(`${reviewSelect}${where} ORDER BY r.created_at DESC`, params)
    return res.json({ success: true, data: reviews })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getReviewById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid review ID.' })
  try {
    const [reviews] = await pool.execute(`${reviewSelect} WHERE r.review_id = ?`, [id])
    if (reviews.length === 0) return res.status(404).json({ success: false, message: 'Review not found.' })
    return res.json({ success: true, data: reviews[0] })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getProductReviews = async (req, res) => {
  const productId = validateId(req.params.productId)
  if (!productId) return res.status(400).json({ success: false, message: 'Invalid product ID.' })
  try {
    const [products] = await pool.execute('SELECT product_id FROM products WHERE product_id = ?', [productId])
    if (products.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    const [reviews] = await pool.execute(`${reviewSelect} WHERE r.product_id = ? AND r.status = TRUE ORDER BY r.created_at DESC`, [productId])
    return res.json({ success: true, data: reviews })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getProductSummary = async (req, res) => {
  const productId = validateId(req.params.productId)
  if (!productId) return res.status(400).json({ success: false, message: 'Invalid product ID.' })
  try {
    const [products] = await pool.execute('SELECT product_id FROM products WHERE product_id = ?', [productId])
    if (products.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    const [rows] = await pool.execute('SELECT COALESCE(ROUND(AVG(rating), 2), 0) AS average_rating, COUNT(review_id) AS review_count FROM reviews WHERE product_id = ? AND status = TRUE', [productId])
    return res.json({ success: true, data: { product_id: productId, average_rating: Number(rows[0].average_rating), review_count: Number(rows[0].review_count) } })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getEligibleProducts = async (req, res) => {
  const customerId = validateId(req.params.customerId)
  if (!customerId) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  try {
    const [customers] = await pool.execute('SELECT user_id, status FROM users WHERE user_id = ?', [customerId])
    if (customers.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    if (!customers[0].status) return res.status(409).json({ success: false, message: 'Inactive customers cannot submit reviews.' })
    const [products] = await pool.execute(`
      SELECT DISTINCT p.product_id, p.product_name, p.price, p.status
      FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.order_id
      INNER JOIN products p ON p.product_id = oi.product_id
      LEFT JOIN reviews r ON r.customer_id = o.user_id AND r.product_id = oi.product_id
      WHERE o.user_id = ? AND o.order_status = 'Delivered' AND r.review_id IS NULL
      ORDER BY p.product_name`, [customerId])
    return res.json({ success: true, data: products })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const createReview = async (req, res) => {
  const customerId = validateId(req.body.customer_id)
  const productId = validateId(req.body.product_id)
  if (!customerId) return res.status(400).json({ success: false, message: 'A valid customer is required.' })
  if (!productId) return res.status(400).json({ success: false, message: 'A valid product is required.' })
  const validation = validateReview(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })
  let connection
  try {
    connection = await pool.getConnection(); await connection.beginTransaction()
    const [customers] = await connection.execute('SELECT user_id, status FROM users WHERE user_id = ? FOR UPDATE', [customerId])
    if (customers.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Customer not found.' }) }
    if (!customers[0].status) { await connection.rollback(); return res.status(409).json({ success: false, message: 'Inactive customers cannot submit reviews.' }) }
    const [products] = await connection.execute('SELECT product_id FROM products WHERE product_id = ? FOR UPDATE', [productId])
    if (products.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Product not found.' }) }
    const [existing] = await connection.execute('SELECT review_id FROM reviews WHERE customer_id = ? AND product_id = ? FOR UPDATE', [customerId, productId])
    if (existing.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'This customer has already reviewed this product.' }) }
    const [purchases] = await connection.execute(`
      SELECT o.order_status FROM orders o
      INNER JOIN order_items oi ON oi.order_id = o.order_id
      WHERE o.user_id = ? AND oi.product_id = ?`, [customerId, productId])
    if (purchases.length === 0) { await connection.rollback(); return res.status(409).json({ success: false, message: 'This product was not purchased by the selected customer.' }) }
    if (!purchases.some((order) => order.order_status === 'Delivered')) { await connection.rollback(); return res.status(409).json({ success: false, message: 'A review can be submitted only after the related order is Delivered.' }) }
    const [result] = await connection.execute('INSERT INTO reviews (product_id, customer_id, rating, review_text) VALUES (?, ?, ?, ?)', [productId, customerId, validation.rating, validation.reviewText])
    await connection.commit()
    return res.status(201).json({ success: true, message: 'Review submitted and is pending moderation.', data: { review_id: result.insertId, status: false } })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}

export const updateReview = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid review ID.' })
  const validation = validateReview(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })
  try {
    const [reviews] = await pool.execute('SELECT r.review_id, u.status AS customer_status FROM reviews r INNER JOIN users u ON u.user_id = r.customer_id WHERE r.review_id = ?', [id])
    if (reviews.length === 0) return res.status(404).json({ success: false, message: 'Review not found.' })
    if (!reviews[0].customer_status) return res.status(409).json({ success: false, message: 'An inactive customer review cannot be edited.' })
    await pool.execute('UPDATE reviews SET rating = ?, review_text = ?, status = FALSE WHERE review_id = ?', [validation.rating, validation.reviewText, id])
    return res.json({ success: true, message: 'Review updated and returned to pending moderation.' })
  } catch (error) { return sendDatabaseError(res, error) }
}

const setModeration = async (req, res, approved) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid review ID.' })
  try {
    const [reviews] = await pool.execute('SELECT review_id, status FROM reviews WHERE review_id = ?', [id])
    if (reviews.length === 0) return res.status(404).json({ success: false, message: 'Review not found.' })
    if (Boolean(reviews[0].status) === approved) return res.status(409).json({ success: false, message: `Review is already ${approved ? 'approved' : 'pending/unapproved'}.` })
    await pool.execute('UPDATE reviews SET status = ? WHERE review_id = ?', [approved, id])
    return res.json({ success: true, message: approved ? 'Review approved successfully.' : 'Review returned to pending/unapproved.' })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const approveReview = (req, res) => setModeration(req, res, true)
export const unapproveReview = (req, res) => setModeration(req, res, false)

export const deleteReview = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid review ID.' })
  try {
    const [result] = await pool.execute('DELETE FROM reviews WHERE review_id = ?', [id])
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Review not found.' })
    return res.json({ success: true, message: 'Review deleted successfully.' })
  } catch (error) { return sendDatabaseError(res, error) }
}
