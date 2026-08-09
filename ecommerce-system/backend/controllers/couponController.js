import pool from '../config/db.js'
import { calculateDiscount, couponAvailabilityError, normalizeCouponCode } from '../services/couponOperations.js'

const FILTERS = ['Active', 'Inactive', 'Expired', 'Scheduled', 'Usage Exhausted']
const validateId = (value) => { const id = Number(value); return Number.isInteger(id) && id > 0 ? id : null }
const databaseError = (res, error) => {
  console.error('Coupon database operation failed:', error.message)
  if (error.code === 'ER_DUP_ENTRY') return res.status(409).json({ success: false, message: 'A coupon with this code already exists.' })
  return res.status(503).json({ success: false, message: 'Database is currently unavailable. Please try again later.' })
}
const validateCoupon = (body, usedCount = 0) => {
  const couponCode = normalizeCouponCode(body.coupon_code)
  const discountType = body.discount_type
  const discountValue = Number(body.discount_value)
  const validFrom = new Date(body.valid_from)
  const validTo = new Date(body.valid_to)
  const usageLimit = Number(body.usage_limit)
  if (!couponCode) return { error: 'Coupon code is required.' }
  if (couponCode.length > 50) return { error: 'Coupon code cannot exceed 50 characters.' }
  if (!['Percentage', 'Fixed'].includes(discountType)) return { error: 'Discount type must be Percentage or Fixed.' }
  if (!Number.isFinite(discountValue) || discountValue <= 0) return { error: 'Discount value must be greater than zero.' }
  if (discountType === 'Percentage' && discountValue > 100) return { error: 'Percentage discount cannot exceed 100.' }
  if (Number.isNaN(validFrom.getTime()) || Number.isNaN(validTo.getTime())) return { error: 'Valid from and valid to must be valid dates.' }
  if (validTo <= validFrom) return { error: 'Valid to must be later than valid from.' }
  if (!Number.isInteger(usageLimit) || usageLimit <= 0) return { error: 'Usage limit must be a positive whole number.' }
  if (usageLimit < Number(usedCount)) return { error: `Usage limit cannot be below the current used count (${usedCount}).` }
  return { couponCode, discountType, discountValue: discountValue.toFixed(2), validFrom, validTo, usageLimit }
}
const select = `SELECT coupon_id, coupon_code, discount_type, discount_value, valid_from, valid_to,
  usage_limit, used_count, status, created_at, updated_at,
  CASE WHEN status = FALSE THEN 'Inactive' WHEN used_count >= usage_limit THEN 'Usage Exhausted'
       WHEN NOW() < valid_from THEN 'Scheduled' WHEN NOW() > valid_to THEN 'Expired' ELSE 'Active' END AS display_status
  FROM coupons`

export const getCoupons = async (req, res) => {
  const filter = typeof req.query.status === 'string' ? req.query.status.trim() : ''
  if (filter && !FILTERS.includes(filter)) return res.status(400).json({ success: false, message: 'Invalid coupon status filter.' })
  const conditions = { Active: 'status = TRUE AND used_count < usage_limit AND NOW() BETWEEN valid_from AND valid_to', Inactive: 'status = FALSE', Expired: 'status = TRUE AND used_count < usage_limit AND NOW() > valid_to', Scheduled: 'status = TRUE AND used_count < usage_limit AND NOW() < valid_from', 'Usage Exhausted': 'status = TRUE AND used_count >= usage_limit' }
  try { const [rows] = await pool.execute(`${select}${filter ? ` WHERE ${conditions[filter]}` : ''} ORDER BY created_at DESC`); return res.json({ success: true, data: rows }) } catch (error) { return databaseError(res, error) }
}
export const getCouponById = async (req, res) => {
  const id = validateId(req.params.id); if (!id) return res.status(400).json({ success: false, message: 'Invalid coupon ID.' })
  try { const [rows] = await pool.execute(`${select} WHERE coupon_id = ?`, [id]); if (!rows.length) return res.status(404).json({ success: false, message: 'Coupon not found.' }); return res.json({ success: true, data: rows[0] }) } catch (error) { return databaseError(res, error) }
}
export const createCoupon = async (req, res) => {
  const value = validateCoupon(req.body); if (value.error) return res.status(400).json({ success: false, message: value.error })
  try { const [result] = await pool.execute('INSERT INTO coupons (coupon_code, discount_type, discount_value, valid_from, valid_to, usage_limit) VALUES (?, ?, ?, ?, ?, ?)', [value.couponCode, value.discountType, value.discountValue, value.validFrom, value.validTo, value.usageLimit]); return res.status(201).json({ success: true, message: 'Coupon created successfully.', data: { coupon_id: result.insertId } }) } catch (error) { return databaseError(res, error) }
}
export const updateCoupon = async (req, res) => {
  const id = validateId(req.params.id); if (!id) return res.status(400).json({ success: false, message: 'Invalid coupon ID.' })
  try { const [rows] = await pool.execute('SELECT used_count FROM coupons WHERE coupon_id = ?', [id]); if (!rows.length) return res.status(404).json({ success: false, message: 'Coupon not found.' }); const value = validateCoupon(req.body, rows[0].used_count); if (value.error) return res.status(400).json({ success: false, message: value.error }); await pool.execute('UPDATE coupons SET coupon_code=?, discount_type=?, discount_value=?, valid_from=?, valid_to=?, usage_limit=? WHERE coupon_id=?', [value.couponCode, value.discountType, value.discountValue, value.validFrom, value.validTo, value.usageLimit, id]); return res.json({ success: true, message: 'Coupon updated successfully.' }) } catch (error) { return databaseError(res, error) }
}
export const deactivateCoupon = async (req, res) => {
  const id = validateId(req.params.id); if (!id) return res.status(400).json({ success: false, message: 'Invalid coupon ID.' })
  try { const [rows] = await pool.execute('SELECT status FROM coupons WHERE coupon_id = ?', [id]); if (!rows.length) return res.status(404).json({ success: false, message: 'Coupon not found.' }); if (!rows[0].status) return res.status(409).json({ success: false, message: 'Coupon is already inactive.' }); await pool.execute('UPDATE coupons SET status=FALSE WHERE coupon_id=?', [id]); return res.json({ success: true, message: 'Coupon deactivated successfully.' }) } catch (error) { return databaseError(res, error) }
}
export const validateCouponCode = async (req, res) => {
  const code = normalizeCouponCode(req.body.coupon_code); const total = Number(req.body.order_total)
  if (!code) return res.status(400).json({ success: false, message: 'Coupon code is required.' })
  if (!Number.isFinite(total) || total < 0) return res.status(400).json({ success: false, message: 'Order total must be a non-negative number.' })
  try { const [rows] = await pool.execute('SELECT * FROM coupons WHERE coupon_code = ?', [code]); if (!rows.length) return res.status(404).json({ success: false, message: 'Coupon not found.' }); const issue = couponAvailabilityError(rows[0]); if (issue) return res.status(issue.status).json({ success: false, message: issue.message }); const totals = calculateDiscount(total, rows[0]); return res.json({ success: true, message: `Coupon ${code} applied successfully.`, data: { coupon_id: rows[0].coupon_id, coupon_code: code, discount_type: rows[0].discount_type, discount_value: rows[0].discount_value, ...totals } }) } catch (error) { return databaseError(res, error) }
}
