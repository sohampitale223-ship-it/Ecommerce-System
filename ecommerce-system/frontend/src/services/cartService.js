import api from './api'

export const getCarts = () => api.get('/api/carts')
export const getCustomerCart = (customerId) => api.get(`/api/carts/customer/${customerId}`)
export const getCartById = (id) => api.get(`/api/carts/${id}`)
export const addToCart = (item) => api.post('/api/carts', item)
export const updateCart = (id, quantity) => api.put(`/api/carts/${id}`, { quantity })
export const removeCart = (id) => api.delete(`/api/carts/${id}`)
