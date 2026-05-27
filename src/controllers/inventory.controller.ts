import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const inventoryItemSchema = z.object({
  name: z.string().min(1, 'Tên nguyên liệu không được để trống'),
  unit: z.string().min(1, 'Đơn vị tính không được để trống'),
  quantity: z.number().nonnegative('Số lượng tồn kho phải lớn hơn hoặc bằng 0'),
  minQuantity: z.number().nonnegative('Ngưỡng cảnh báo phải lớn hơn hoặc bằng 0'),
  costPrice: z.number().int().nonnegative('Giá nhập phải lớn hơn hoặc bằng 0'),
  isActive: z.boolean().default(true),
});

const stockTransactionSchema = z.object({
  quantity: z.number().positive('Số lượng thay đổi phải lớn hơn 0'),
  note: z.string().optional(),
});

export const getInventory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { status } = req.query;

    const where: any = {};
    if (status === 'low') {
      where.quantity = {
        lte: prisma.inventoryItem.fields.minQuantity
      };
    }

    const items = await prisma.inventoryItem.findMany({
      where,
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: items
    });
  } catch (err) {
    next(err);
  }
};

export const createInventoryItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = inventoryItemSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const existingItem = await prisma.inventoryItem.findFirst({
      where: { name: validation.data.name }
    });

    if (existingItem) {
      return next(new AppError('Nguyên liệu này đã tồn tại trong kho', 400));
    }

    const newItem = await prisma.inventoryItem.create({
      data: validation.data
    });

    res.status(201).json({
      success: true,
      data: newItem
    });
  } catch (err) {
    next(err);
  }
};

export const updateInventoryItem = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = inventoryItemSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    });

    if (!item) {
      return next(new AppError('Mặt hàng kho không tồn tại', 404));
    }

    const updatedItem = await prisma.inventoryItem.update({
      where: { id },
      data: validation.data
    });

    res.json({
      success: true,
      data: updatedItem
    });
  } catch (err) {
    next(err);
  }
};

export const importStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = stockTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { quantity, note } = validation.data;

    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    });

    if (!item) {
      return next(new AppError('Mặt hàng kho không tồn tại', 404));
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // 1. Log transaction
      await tx.inventoryLog.create({
        data: {
          itemId: id,
          type: 'import',
          quantity,
          note: note || 'Nhập kho bổ sung',
          employeeId: req.employee?.id || 'system',
          employeeName: req.employee?.name || 'Hệ thống'
        }
      });

      // 2. Add quantity
      return tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: item.quantity + quantity
        }
      });
    });

    res.json({
      success: true,
      data: updatedItem,
      message: 'Đã nhập kho thành công'
    });
  } catch (err) {
    next(err);
  }
};

export const exportStock = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = stockTransactionSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { quantity, note } = validation.data;

    const item = await prisma.inventoryItem.findUnique({
      where: { id }
    });

    if (!item) {
      return next(new AppError('Mặt hàng kho không tồn tại', 404));
    }

    if (item.quantity < quantity) {
      return next(new AppError(`Số lượng xuất kho vượt quá lượng hàng trong kho (${item.quantity} ${item.unit})`, 400));
    }

    const updatedItem = await prisma.$transaction(async (tx) => {
      // 1. Log transaction
      await tx.inventoryLog.create({
        data: {
          itemId: id,
          type: 'export',
          quantity,
          note: note || 'Xuất kho sử dụng',
          employeeId: req.employee?.id || 'system',
          employeeName: req.employee?.name || 'Hệ thống'
        }
      });

      // 2. Deduct quantity
      return tx.inventoryItem.update({
        where: { id },
        data: {
          quantity: item.quantity - quantity
        }
      });
    });

    res.json({
      success: true,
      data: updatedItem,
      message: 'Đã xuất kho thành công'
    });
  } catch (err) {
    next(err);
  }
};

export const getInventoryLogs = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const logs = await prisma.inventoryLog.findMany({
      include: {
        item: {
          select: {
            name: true,
            unit: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 100 // limit to last 100 logs
    });

    res.json({
      success: true,
      data: logs
    });
  } catch (err) {
    next(err);
  }
};
