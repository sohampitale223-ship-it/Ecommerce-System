import { Router } from 'express'
import {
  createCategory,
  deactivateCategory,
  getCategories,
  getCategoryById,
  updateCategory,
} from '../controllers/categoryController.js'

const router = Router()

router.get('/', getCategories)
router.get('/:id', getCategoryById)
router.post('/', createCategory)
router.put('/:id', updateCategory)
router.patch('/:id/deactivate', deactivateCategory)

export default router
