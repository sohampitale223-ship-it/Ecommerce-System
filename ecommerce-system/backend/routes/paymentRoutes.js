import { Router } from 'express'
import { createPayment, getPaymentById, getPayments, refundPayment } from '../controllers/paymentController.js'

const router = Router()
router.get('/', getPayments)
router.get('/:id', getPaymentById)
router.post('/', createPayment)
router.patch('/:id/refund', refundPayment)

export default router
