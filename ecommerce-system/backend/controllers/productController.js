import pool from '../config/db.js'

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const validateProduct = (body = {}) => {
  const productName = typeof body.product_name === 'string' ? body.product_name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''
  const sku = typeof body.SKU === 'string' ? body.SKU.trim() : ''
  const price = Number(body.price)
  const categoryId = validateId(body.category_id)
  const inventoryCount = Number(body.inventory_count)

  if (!productName) return { error: 'Product name is required.' }
  if (productName.length > 150) return { error: 'Product name cannot exceed 150 characters.' }
  if (description.length > 500) return { error: 'Description cannot exceed 500 characters.' }
  if (!Number.isFinite(price) || price < 0 || price > 99999999.99) return { error: 'Price must be between 0 and 99999999.99.' }
  if (!sku) return { error: 'SKU is required.' }
  if (sku.length > 50) return { error: 'SKU cannot exceed 50 characters.' }
  if (!categoryId) return { error: 'A valid category is required.' }
  if (!Number.isInteger(inventoryCount) || inventoryCount < 0) return { error: 'Inventory count must be a non-negative whole number.' }

  return {
    productName,
    description: description || null,
    price: price.toFixed(2),
    sku,
    categoryId,
    inventoryCount,
  }
}

const skuExists = async (sku, excludedId = null) => {
  let query = 'SELECT product_id FROM products WHERE LOWER(`SKU`) = LOWER(?)'
  const params = [sku]
  if (excludedId !== null) {
    query += ' AND product_id <> ?'
    params.push(excludedId)
  }
  const [rows] = await pool.execute(query, params)
  return rows.length > 0
}

const activeCategoryExists = async (categoryId) => {
  const [rows] = await pool.execute(
    'SELECT category_id FROM categories WHERE category_id = ? AND status = TRUE',
    [categoryId],
  )
  return rows.length > 0
}

const sendDatabaseError = (res, error) => {
  console.error('Product database operation failed:', error.message)
  if (error.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ success: false, message: 'A product with this SKU already exists.' })
  }
  if (error.code === 'ER_NO_REFERENCED_ROW_2') {
    return res.status(400).json({ success: false, message: 'The selected category does not exist.' })
  }
  return res.status(503).json({
    success: false,
    message: 'Database is currently unavailable. Please try again later.',
  })
}

const productSelect = `
  SELECT p.product_id, p.product_name, p.description, p.price, p.\`SKU\`,
         p.category_id, c.category_name, p.inventory_count,
         p.created_at, p.updated_at, p.status
  FROM products p
  INNER JOIN categories c ON c.category_id = p.category_id
`

export const getProducts = async (req, res) => {
  try {
    const [products] = await pool.execute(`${productSelect} ORDER BY p.created_at DESC`)
    return res.json({ success: true, data: products })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const getProductById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid product ID.' })

  try {
    const [rows] = await pool.execute(`${productSelect} WHERE p.product_id = ?`, [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    return res.json({ success: true, data: rows[0] })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const createProduct = async (req, res) => {
  const validation = validateProduct(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })

  try {
    if (!(await activeCategoryExists(validation.categoryId))) {
      return res.status(400).json({ success: false, message: 'Please select an active category.' })
    }
    if (await skuExists(validation.sku)) {
      return res.status(409).json({ success: false, message: 'A product with this SKU already exists.' })
    }
    const [result] = await pool.execute(
      `INSERT INTO products (product_name, description, price, \`SKU\`, category_id, inventory_count)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [validation.productName, validation.description, validation.price, validation.sku, validation.categoryId, validation.inventoryCount],
    )
    return res.status(201).json({
      success: true,
      message: 'Product created successfully',
      data: { product_id: result.insertId },
    })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const updateProduct = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid product ID.' })
  const validation = validateProduct(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })

  try {
    const [existing] = await pool.execute('SELECT product_id FROM products WHERE product_id = ?', [id])
    if (existing.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    if (!(await activeCategoryExists(validation.categoryId))) {
      return res.status(400).json({ success: false, message: 'Please select an active category.' })
    }
    if (await skuExists(validation.sku, id)) {
      return res.status(409).json({ success: false, message: 'A product with this SKU already exists.' })
    }
    await pool.execute(
      `UPDATE products SET product_name = ?, description = ?, price = ?, \`SKU\` = ?, category_id = ?, inventory_count = ?
       WHERE product_id = ?`,
      [validation.productName, validation.description, validation.price, validation.sku, validation.categoryId, validation.inventoryCount, id],
    )
    return res.json({ success: true, message: 'Product updated successfully' })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const deactivateProduct = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid product ID.' })

  try {
    const [rows] = await pool.execute('SELECT product_id, status FROM products WHERE product_id = ?', [id])
    if (rows.length === 0) return res.status(404).json({ success: false, message: 'Product not found.' })
    if (!rows[0].status) return res.status(409).json({ success: false, message: 'Product is already inactive.' })
    await pool.execute('UPDATE products SET status = FALSE WHERE product_id = ?', [id])
    return res.json({ success: true, message: 'Product deactivated successfully' })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}
