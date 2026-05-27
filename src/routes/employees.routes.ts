import { Router } from 'express';
import {
  getMe,
  getEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from '../controllers/employees.controller';
import { verifyToken, requireRole } from '../middleware/auth.middleware';

const router = Router();

// Endpoint for any logged in user to check their own profile
router.get('/me', verifyToken, getMe);

// Admin-only management endpoints
router.get('/', verifyToken, requireRole(['admin']), getEmployees);
router.post('/', verifyToken, requireRole(['admin']), createEmployee);
router.put('/:id', verifyToken, requireRole(['admin']), updateEmployee);
router.delete('/:id', verifyToken, requireRole(['admin']), deleteEmployee);

export default router;
