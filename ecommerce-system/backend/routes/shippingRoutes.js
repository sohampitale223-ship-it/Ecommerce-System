import { Router } from 'express'
import { createShipping, getShipping, getShippingById, updateShipping, updateShippingStatus } from '../controllers/shippingController.js'

const router = Router()
router.get('/', getShipping)
router.get('/:id', getShippingById)
router.post('/', createShipping)
router.put('/:id', updateShipping)
router.patch('/:id/status', updateShippingStatus)

export default router
