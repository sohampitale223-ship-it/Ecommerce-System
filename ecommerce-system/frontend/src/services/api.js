import axios from 'axios'

const api = axios.create({
  baseURL: 'http://localhost:5000',
  timeout: 5000,
})

export const getBackendStatus = () => api.get('/api/test')

export default api
