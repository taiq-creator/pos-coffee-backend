import { Router } from 'express';
import {
  getOrders,
  getOrderById,
  createOrder,
  cancelOrder,
} from '../controllers/orders.controller';
import { verifyToken } from '../middleware/auth.middleware';

const router = Router();

// Authenticated access for order processing
router.get('/', verifyToken, getOrders);
router.get('/:id', verifyToken, getOrderById);
router.post('/', verifyToken, createOrder);
router.patch('/:id/cancel', verifyToken, cancelOrder);

export default router;
