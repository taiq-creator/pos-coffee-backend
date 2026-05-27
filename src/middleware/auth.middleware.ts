import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase-admin';
import { prisma } from '../lib/prisma';
import { AppError } from './error.middleware';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
  employee?: {
    id: string;
    name: string;
    email: string;
    role: string;
    isActive: boolean;
  };
}

export const verifyToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return next(new AppError('Vui lòng đăng nhập để thực hiện thao tác này', 401));
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token with Supabase Auth
    const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

    if (error || !user) {
      return next(new AppError('Phiên đăng nhập không hợp lệ hoặc đã hết hạn', 401));
    }

    // Find the corresponding employee in our local Postgres database
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          { authId: user.id },
          { email: user.email }
        ],
        isActive: true
      }
    });

    if (!employee) {
      return next(new AppError('Tài khoản nhân viên không tồn tại hoặc đã bị vô hiệu hóa', 403));
    }

    // Attach user and employee information to the request object
    req.user = {
      id: user.id,
      email: user.email,
    };
    req.employee = {
      id: employee.id,
      name: employee.name,
      email: employee.email,
      role: employee.role,
      isActive: employee.isActive,
    };

    // If the local employee doesn't have an authId linked yet, link it now
    if (!employee.authId) {
      await prisma.employee.update({
        where: { id: employee.id },
        data: { authId: user.id }
      });
    }

    next();
  } catch (err) {
    next(err);
  }
};

export const requireRole = (roles: string[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.employee) {
      return next(new AppError('Vui lòng đăng nhập', 401));
    }

    if (!roles.includes(req.employee.role)) {
      return next(new AppError('Bạn không có quyền thực hiện chức năng này', 403));
    }

    next();
  };
};
