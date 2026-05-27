import { Router } from 'express';
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from '../controllers/categories.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Public/Staff access to list categories
router.get('/', verifyToken, getCategories);

// Admin-only management
router.post('/', verifyToken, requireRole(['admin']), createCategory);
router.put('/:id', verifyToken, requireRole(['admin']), updateCategory);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteCategory);

export default router;
