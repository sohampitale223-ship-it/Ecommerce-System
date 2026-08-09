import api from './api'
export const getCoupons = (status = '') => api.get('/api/coupons', { params: status ? { status } : {} })
export const createCoupon = (coupon) => api.post('/api/coupons', coupon)
export const updateCoupon = (id, coupon) => api.put(`/api/coupons/${id}`, coupon)
export const deactivateCoupon = (id) => api.patch(`/api/coupons/${id}/deactivate`)
export const validateCoupon = (couponCode, orderTotal) => api.post('/api/coupons/validate', { coupon_code: couponCode, order_total: orderTotal })
