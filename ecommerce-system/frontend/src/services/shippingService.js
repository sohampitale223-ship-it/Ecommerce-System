import api from './api'

export const getShipping = (status = '') => api.get('/api/shipping', { params: status ? { status } : {} })
export const getShippingById = (id) => api.get(`/api/shipping/${id}`)
export const createShipping = (shipping) => api.post('/api/shipping', shipping)
export const updateShipping = (id, shipping) => api.put(`/api/shipping/${id}`, shipping)
export const updateShippingStatus = (id, shippingStatus) => api.patch(`/api/shipping/${id}/status`, { shipping_status: shippingStatus })
