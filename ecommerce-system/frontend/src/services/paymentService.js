import api from './api'

export const getPayments = (status = '') => api.get('/api/payments', { params: status ? { status } : {} })
export const getPaymentById = (id) => api.get(`/api/payments/${id}`)
export const createPayment = (payment) => api.post('/api/payments', payment)
export const refundPayment = (id) => api.patch(`/api/payments/${id}/refund`)
