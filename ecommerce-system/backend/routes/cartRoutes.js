import { Router } from 'express'
import { addToCart, getCartById, getCarts, getCustomerCart, removeCart, updateCart } from '../controllers/cartController.js'

const router = Router()
router.get('/', getCarts)
router.get('/customer/:customerId', getCustomerCart)
router.get('/:id', getCartById)
router.post('/', addToCart)
router.put('/:id', updateCart)
router.delete('/:id', removeCart)

export default router
