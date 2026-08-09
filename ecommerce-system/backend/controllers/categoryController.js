import pool from '../config/db.js'

const validateId = (value) => {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

const validateCategory = (body = {}) => {
  const categoryName = typeof body.category_name === 'string' ? body.category_name.trim() : ''
  const description = typeof body.description === 'string' ? body.description.trim() : ''

  if (!categoryName) return { error: 'Category name is required.' }
  if (categoryName.length > 100) return { error: 'Category name cannot exceed 100 characters.' }
  if (description.length > 300) return { error: 'Description cannot exceed 300 characters.' }

  return { categoryName, description: description || null }
}

const activeDuplicateExists = async (categoryName, excludedId = null) => {
  let query = 'SELECT category_id FROM categories WHERE LOWER(category_name) = LOWER(?) AND status = TRUE'
  const params = [categoryName]

  if (excludedId !== null) {
    query += ' AND category_id <> ?'
    params.push(excludedId)
  }

  const [rows] = await pool.execute(query, params)
  return rows.length > 0
}

const getProductCount = async (categoryId) => {
  const [rows] = await pool.execute(
    'SELECT COUNT(*) AS product_count FROM products WHERE category_id = ? AND status = TRUE',
    [categoryId],
  )
  return Number(rows[0].product_count)
}

const sendDatabaseError = (res, error) => {
  console.error('Category database operation failed:', error.message)
  return res.status(503).json({
    success: false,
    message: 'Database is currently unavailable. Please try again later.',
  })
}

export const getCategories = async (req, res) => {
  try {
    const [categories] = await pool.execute(`
      SELECT c.category_id, c.category_name, c.description, c.created_at, c.updated_at, c.status,
             COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.category_id AND p.status = TRUE
      GROUP BY c.category_id, c.category_name, c.description, c.created_at, c.updated_at, c.status
      ORDER BY c.created_at DESC
    `)
    return res.json({ success: true, data: categories })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const getCategoryById = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid category ID.' })

  try {
    const [rows] = await pool.execute(`
      SELECT c.category_id, c.category_name, c.description, c.created_at, c.updated_at, c.status,
             COUNT(p.product_id) AS product_count
      FROM categories c
      LEFT JOIN products p ON p.category_id = c.category_id AND p.status = TRUE
      WHERE c.category_id = ?
      GROUP BY c.category_id, c.category_name, c.description, c.created_at, c.updated_at, c.status
    `, [id])

    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }
    return res.json({ success: true, data: rows[0] })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const createCategory = async (req, res) => {
  const validation = validateCategory(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })

  try {
    if (await activeDuplicateExists(validation.categoryName)) {
      return res.status(409).json({ success: false, message: 'An active category with this name already exists.' })
    }

    const [result] = await pool.execute(
      'INSERT INTO categories (category_name, description) VALUES (?, ?)',
      [validation.categoryName, validation.description],
    )
    return res.status(201).json({
      success: true,
      message: 'Category created successfully',
      data: { category_id: result.insertId },
    })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const updateCategory = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid category ID.' })

  const validation = validateCategory(req.body)
  if (validation.error) return res.status(400).json({ success: false, message: validation.error })

  try {
    const [existing] = await pool.execute('SELECT category_id FROM categories WHERE category_id = ?', [id])
    if (existing.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }
    if (await activeDuplicateExists(validation.categoryName, id)) {
      return res.status(409).json({ success: false, message: 'An active category with this name already exists.' })
    }

    await pool.execute(
      'UPDATE categories SET category_name = ?, description = ? WHERE category_id = ?',
      [validation.categoryName, validation.description, id],
    )
    return res.json({ success: true, message: 'Category updated successfully' })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}

export const deactivateCategory = async (req, res) => {
  const id = validateId(req.params.id)
  if (!id) return res.status(400).json({ success: false, message: 'Invalid category ID.' })

  try {
    const [rows] = await pool.execute('SELECT category_id, status FROM categories WHERE category_id = ?', [id])
    if (rows.length === 0) {
      return res.status(404).json({ success: false, message: 'Category not found.' })
    }
    if (!rows[0].status) {
      return res.status(409).json({ success: false, message: 'Category is already inactive.' })
    }

    const productCount = await getProductCount(id)
    if (productCount > 0) {
      return res.status(409).json({
        success: false,
        message: 'This category contains products. Please assign those products to another category before deactivating it.',
      })
    }

    await pool.execute('UPDATE categories SET status = FALSE WHERE category_id = ?', [id])
    return res.json({ success: true, message: 'Category deactivated successfully' })
  } catch (error) {
    return sendDatabaseError(res, error)
  }
}
