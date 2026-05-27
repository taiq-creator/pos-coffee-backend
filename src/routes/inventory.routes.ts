import { Router } from 'express';
import {
  getInventory,
  createInventoryItem,
  updateInventoryItem,
  importStock,
  exportStock,
  getInventoryLogs,
} from '../controllers/inventory.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Staff/Admin access for reading inventory
router.get('/', verifyToken, getInventory);

// Admin-only management endpoints
router.post('/', verifyToken, requireRole(['admin']), createInventoryItem);
router.put('/:id', verifyToken, requireRole(['admin']), updateInventoryItem);

// Stocking operations (allowed for cashiers/staff with logging)
router.post('/:id/import', verifyToken, importStock);
router.post('/:id/export', verifyToken, exportStock);

// Logs access (Admin-only)
router.get('/logs', verifyToken, requireRole(['admin']), getInventoryLogs);

export default router;
