import api from './api'

export const getOrders = (status = '') => api.get('/api/orders', { params: status ? { status } : {} })
export const getOrderById = (id) => api.get(`/api/orders/${id}`)
export const createOrder = (order) => api.post('/api/orders', order)
export const updateOrderStatus = (id, orderStatus) => api.patch(`/api/orders/${id}/status`, { order_status: orderStatus })
export const cancelOrder = (id) => api.patch(`/api/orders/${id}/cancel`)
