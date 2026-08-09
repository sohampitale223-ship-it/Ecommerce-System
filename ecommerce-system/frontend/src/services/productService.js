import api from './api'

export const getProducts = () => api.get('/api/products')
export const getProductById = (id) => api.get(`/api/products/${id}`)
export const createProduct = (product) => api.post('/api/products', product)
export const updateProduct = (id, product) => api.put(`/api/products/${id}`, product)
export const deactivateProduct = (id) => api.patch(`/api/products/${id}/deactivate`)
