import { Router } from 'express';
import {
  getToppings,
  createTopping,
  updateTopping,
  deleteTopping,
} from '../controllers/toppings.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Staff/Admin access to list toppings
router.get('/', verifyToken, getToppings);

// Admin-only management
router.post('/', verifyToken, requireRole(['admin']), createTopping);
router.put('/:id', verifyToken, requireRole(['admin']), updateTopping);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteTopping);

export default router;
