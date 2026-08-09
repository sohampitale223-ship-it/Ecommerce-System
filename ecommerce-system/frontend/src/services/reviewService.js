import api from './api'

export const getReviews = ({ status = '', rating = '', productId = '' } = {}) => api.get('/api/reviews', { params: { ...(status ? { status } : {}), ...(rating ? { rating } : {}), ...(productId ? { product_id: productId } : {}) } })
export const getReviewById = (id) => api.get(`/api/reviews/${id}`)
export const getProductReviews = (productId) => api.get(`/api/reviews/product/${productId}`)
export const getProductReviewSummary = (productId) => api.get(`/api/reviews/product/${productId}/summary`)
export const getEligibleReviewProducts = (customerId) => api.get(`/api/reviews/eligible-products/${customerId}`)
export const createReview = (review) => api.post('/api/reviews', review)
export const updateReview = (id, review) => api.put(`/api/reviews/${id}`, review)
export const approveReview = (id) => api.patch(`/api/reviews/${id}/approve`)
export const unapproveReview = (id) => api.patch(`/api/reviews/${id}/unapprove`)
export const deleteReview = (id) => api.delete(`/api/reviews/${id}`)
