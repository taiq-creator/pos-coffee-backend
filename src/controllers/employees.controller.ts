import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const employeeSchema = z.object({
  name: z.string().min(1, 'Tên nhân viên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  phone: z.string().optional().nullable(),
  role: z.enum(['admin', 'cashier', 'staff']).default('cashier'),
  isActive: z.boolean().default(true),
});

export const getMe = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.employee) {
      return next(new AppError('Vui lòng đăng nhập', 401));
    }
    res.json({
      success: true,
      data: req.employee
    });
  } catch (err) {
    next(err);
  }
};

export const getEmployees = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: employees
    });
  } catch (err) {
    next(err);
  }
};

export const createEmployee = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = employeeSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { name, email, phone, role, isActive } = validation.data;

    const existingEmployee = await prisma.employee.findUnique({
      where: { email }
    });

    if (existingEmployee) {
      return next(new AppError('Nhân viên với email này đã tồn tại', 400));
    }

    const newEmployee = await prisma.employee.create({
      data: {
        name,
        email,
        phone,
        role,
        isActive
      }
    });

    res.status(201).json({
      success: true,
      data: newEmployee
    });
  } catch (err) {
    next(err);
  }
};

export const updateEmployee = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = employeeSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const employee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!employee) {
      return next(new AppError('Nhân viên không tồn tại', 404));
    }

    const updatedEmployee = await prisma.employee.update({
      where: { id },
      data: validation.data
    });

    res.json({
      success: true,
      data: updatedEmployee
    });
  } catch (err) {
    next(err);
  }
};

export const deleteEmployee = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const employee = await prisma.employee.findUnique({
      where: { id }
    });

    if (!employee) {
      return next(new AppError('Nhân viên không tồn tại', 404));
    }

    // Do not delete the last admin
    if (employee.role === 'admin') {
      const adminCount = await prisma.employee.count({
        where: { role: 'admin', isActive: true }
      });
      if (adminCount <= 1) {
        return next(new AppError('Không thể xóa tài khoản Quản trị duy nhất đang hoạt động', 400));
      }
    }

    await prisma.employee.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Đã xóa nhân viên thành công'
    });
  } catch (err) {
    next(err);
  }
};
