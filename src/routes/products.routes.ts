import { Router } from 'express';
import {
  getProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
} from '../controllers/products.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Staff/Admin access to view products
router.get('/', verifyToken, getProducts);
router.get('/:id', verifyToken, getProductById);

// Admin-only management
router.post('/', verifyToken, requireRole(['admin']), createProduct);
router.put('/:id', verifyToken, requireRole(['admin']), updateProduct);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteProduct);

export default router;
