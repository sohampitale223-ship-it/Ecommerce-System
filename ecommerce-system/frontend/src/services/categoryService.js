import api from './api'

export const getCategories = () => api.get('/api/categories')
export const getCategoryById = (id) => api.get(`/api/categories/${id}`)
export const createCategory = (category) => api.post('/api/categories', category)
export const updateCategory = (id, category) => api.put(`/api/categories/${id}`, category)
export const deactivateCategory = (id) => api.patch(`/api/categories/${id}/deactivate`)
