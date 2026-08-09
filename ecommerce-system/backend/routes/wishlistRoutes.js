import { Router } from 'express'
import { addToWishlist, getCustomerWishlist, getWishlistById, getWishlists, moveToCart, removeWishlist } from '../controllers/wishlistController.js'

const router = Router()
router.get('/', getWishlists)
router.get('/customer/:customerId', getCustomerWishlist)
router.get('/:id', getWishlistById)
router.post('/', addToWishlist)
router.post('/:id/move-to-cart', moveToCart)
router.delete('/:id', removeWishlist)

export default router
