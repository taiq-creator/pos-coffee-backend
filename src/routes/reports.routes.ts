import { Router } from 'express';
import {
  getSummary,
  getRevenueReport,
  getTopProductsReport,
  getByCategoryReport,
} from '../controllers/reports.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Staff/Admin access for basic dashboard summary
router.get('/summary', verifyToken, getSummary);

// Admin-only comprehensive reports
router.get('/revenue', verifyToken, requireRole(['admin']), getRevenueReport);
router.get('/top-products', verifyToken, requireRole(['admin']), getTopProductsReport);
router.get('/category', verifyToken, requireRole(['admin']), getByCategoryReport);

export default router;
