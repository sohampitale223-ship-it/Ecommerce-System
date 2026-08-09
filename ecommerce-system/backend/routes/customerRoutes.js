import { Router } from 'express'
import {
  createCustomer, deactivateCustomer, getCustomerById, getCustomerOrders, getCustomers, updateCustomer,
} from '../controllers/customerController.js'

const router = Router()
router.get('/', getCustomers)
router.get('/:id/orders', getCustomerOrders)
router.get('/:id', getCustomerById)
router.post('/', createCustomer)
router.put('/:id', updateCustomer)
router.patch('/:id/deactivate', deactivateCustomer)

export default router
