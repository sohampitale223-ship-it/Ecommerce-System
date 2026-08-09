import pool from '../config/db.js'
import { addProductToCart, CartOperationError } from '../services/cartOperations.js'

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const sendDatabaseError = (res, error) => {
  console.error('Wishlist database operation failed:', error.message)
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'This product is already in the customer wishlist.' })
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(404).json({ success: false, message: 'The selected customer or product does not exist.' })
  }
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}

const wishlistSelect = `
  SELECT w.wishlist_id, w.customer_id,
         CONCAT(u.first_name, ' ', u.last_name) AS customer_name,
         w.product_id, p.product_name, p.price AS product_price,
         p.inventory_count, p.status AS product_status,
         w.created_at, w.updated_at
  FROM wishlists w
  INNER JOIN users u ON u.user_id = w.customer_id
  INNER JOIN products p ON p.product_id = w.product_id
`

export const getWishlists = async (req, res) => {
  try {
    const [items] = await pool.execute(`${wishlistSelect} ORDER BY w.updated_at DESC`)
    return res.json({ success: true, data: items })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getCustomerWishlist = async (req, res) => {
  const customerId = validateId(req.params.customerId)
  if (!customerId) return res.status(400).json({ success: false, message: 'Invalid customer ID.' })
  try {
    const [customers] = await pool.execute('SELECT user_id FROM users WHERE user_id = ?', [customerId])
    if (customers.length === 0) return res.status(404).json({ success: false, message: 'Customer not found.' })
    const [items] = await pool.execute(`${wishlistSelect} WHERE w.customer_id = ? ORDER BY w.updated_at DESC`, [customerId])
    return res.json({ success: true, data: items })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const getWishlistById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid wishlist ID.' })
  try {
    const [items] = await pool.execute(`${wishlistSelect} WHERE w.wishlist_id = ?`, [id])
    if (items.length === 0) return res.status(404).json({ success: false, message: 'Wishlist item not found.' })
    return res.json({ success: true, data: items[0] })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const addToWishlist = async (req, res) => {
  const customerId = validateId(req.body.customer_id)
  const productId = validateId(req.body.product_id)
  if (!customerId) return res.status(400).json({ success: false, message: 'A valid customer is required.' })
  if (!productId) return res.status(400).json({ success: false, message: 'A valid product is required.' })
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [customers] = await connection.execute('SELECT user_id, status FROM users WHERE user_id = ? FOR UPDATE', [customerId])
    if (customers.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Customer not found.' }) }
    if (!customers[0].status) { await connection.rollback(); return res.status(409).json({ success: false, message: 'Inactive customers cannot add wishlist items.' }) }
    const [products] = await connection.execute('SELECT product_id, status FROM products WHERE product_id = ? FOR UPDATE', [productId])
    if (products.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Product not found.' }) }
    if (!products[0].status) { await connection.rollback(); return res.status(409).json({ success: false, message: 'Inactive products cannot be added to a wishlist.' }) }
    const [existing] = await connection.execute('SELECT wishlist_id FROM wishlists WHERE customer_id = ? AND product_id = ? FOR UPDATE', [customerId, productId])
    if (existing.length) { await connection.rollback(); return res.status(409).json({ success: false, message: 'This product is already in the customer wishlist.' }) }
    const [result] = await connection.execute('INSERT INTO wishlists (customer_id, product_id) VALUES (?, ?)', [customerId, productId])
    await connection.commit()
    return res.status(201).json({ success: true, message: 'Product added to wishlist successfully.', data: { wishlist_id: result.insertId } })
  } catch (error) {
    if (connection) await connection.rollback()
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}

export const removeWishlist = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid wishlist ID.' })
  try {
    const [result] = await pool.execute('DELETE FROM wishlists WHERE wishlist_id = ?', [id])
    if (result.affectedRows === 0) return res.status(404).json({ success: false, message: 'Wishlist item not found.' })
    return res.json({ success: true, message: 'Wishlist item removed successfully. Inventory and cart were unchanged.' })
  } catch (error) { return sendDatabaseError(res, error) }
}

export const moveToCart = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid wishlist ID.' })
  let connection
  try {
    connection = await pool.getConnection()
    await connection.beginTransaction()
    const [items] = await connection.execute('SELECT wishlist_id, customer_id, product_id FROM wishlists WHERE wishlist_id = ? FOR UPDATE', [id])
    if (items.length === 0) { await connection.rollback(); return res.status(404).json({ success: false, message: 'Wishlist item not found.' }) }
    const item = items[0]
    const cart = await addProductToCart(connection, { customerId: item.customer_id, productId: item.product_id, quantity: 1 })
    const [deleted] = await connection.execute('DELETE FROM wishlists WHERE wishlist_id = ?', [id])
    if (deleted.affectedRows !== 1) throw new Error('Wishlist item could not be removed after the cart update.')
    await connection.commit()
    return res.json({ success: true, message: cart.updatedExisting ? 'Wishlist item moved to cart and existing quantity increased.' : 'Wishlist item moved to cart successfully.', data: { cart_id: cart.cartId, quantity: cart.quantity, total_price: cart.totalPrice } })
  } catch (error) {
    if (connection) await connection.rollback()
    if (error instanceof CartOperationError) return res.status(error.status).json({ success: false, message: error.message })
    return sendDatabaseError(res, error)
  } finally { if (connection) connection.release() }
}
