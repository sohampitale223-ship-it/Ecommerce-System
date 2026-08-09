import { Router } from 'express'
import { approveReview, createReview, deleteReview, getEligibleProducts, getProductReviews, getProductSummary, getReviewById, getReviews, unapproveReview, updateReview } from '../controllers/reviewController.js'

const router = Router()
router.get('/', getReviews)
router.get('/eligible-products/:customerId', getEligibleProducts)
router.get('/product/:productId/summary', getProductSummary)
router.get('/product/:productId', getProductReviews)
router.get('/:id', getReviewById)
router.post('/', createReview)
router.put('/:id', updateReview)
router.patch('/:id/approve', approveReview)
router.patch('/:id/unapprove', unapproveReview)
router.delete('/:id', deleteReview)

export default router
