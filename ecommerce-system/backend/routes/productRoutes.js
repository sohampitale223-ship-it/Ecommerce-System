import { Router } from 'express'
import {
  createProduct,
  deactivateProduct,
  getProductById,
  getProducts,
  updateProduct,
} from '../controllers/productController.js'

const router = Router()

router.get('/', getProducts)
router.get('/:id', getProductById)
router.post('/', createProduct)
router.put('/:id', updateProduct)
router.patch('/:id/deactivate', deactivateProduct)

export default router
