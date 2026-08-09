import { Router } from 'express'
import {
  cancelOrder,
  createOrder,
  getOrderById,
  getOrders,
  updateOrderStatus,
} from '../controllers/orderController.js'

const router = Router()

router.get('/', getOrders)
router.get('/:id', getOrderById)
router.post('/', createOrder)
router.patch('/:id/status', updateOrderStatus)
router.patch('/:id/cancel', cancelOrder)

export default router
