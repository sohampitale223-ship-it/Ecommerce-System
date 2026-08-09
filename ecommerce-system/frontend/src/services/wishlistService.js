import api from './api'

export const getWishlists = () => api.get('/api/wishlists')
export const getCustomerWishlist = (customerId) => api.get(`/api/wishlists/customer/${customerId}`)
export const getWishlistById = (id) => api.get(`/api/wishlists/${id}`)
export const addToWishlist = (item) => api.post('/api/wishlists', item)
export const moveWishlistToCart = (id) => api.post(`/api/wishlists/${id}/move-to-cart`)
export const removeWishlist = (id) => api.delete(`/api/wishlists/${id}`)
