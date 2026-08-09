import api from './api'

export const getCustomers = () => api.get('/api/customers')
export const getCustomerById = (id) => api.get(`/api/customers/${id}`)
export const getCustomerOrders = (id) => api.get(`/api/customers/${id}/orders`)
export const createCustomer = (customer) => api.post('/api/customers', customer)
export const updateCustomer = (id, customer) => api.put(`/api/customers/${id}`, customer)
export const deactivateCustomer = (id) => api.patch(`/api/customers/${id}/deactivate`)
