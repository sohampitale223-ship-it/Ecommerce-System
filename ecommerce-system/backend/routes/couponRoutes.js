import { Router } from 'express'
import { createCoupon, deactivateCoupon, getCouponById, getCoupons, updateCoupon, validateCouponCode } from '../controllers/couponController.js'
const router = Router()
router.get('/', getCoupons)
router.post('/validate', validateCouponCode)
router.get('/:id', getCouponById)
router.post('/', createCoupon)
router.put('/:id', updateCoupon)
router.patch('/:id/deactivate', deactivateCoupon)
export default router
