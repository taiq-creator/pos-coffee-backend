import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const orderItemSchema = z.object({
  productId: z.string().min(1, 'Mã sản phẩm không hợp lệ'),
  size: z.enum(['S', 'M', 'L']),
  quantity: z.number().int().positive('Số lượng phải lớn hơn 0'),
  unitPrice: z.number().int().nonnegative(),
  toppings: z.array(z.string()).optional(),
  totalPrice: z.number().int().nonnegative(),
});

const createOrderSchema = z.object({
  items: z.array(orderItemSchema).min(1, 'Đơn hàng phải có ít nhất 1 sản phẩm'),
  totalAmount: z.number().int().nonnegative(),
  discount: z.number().int().nonnegative().default(0),
  finalAmount: z.number().int().nonnegative(),
  paymentMethod: z.enum(['cash', 'transfer']),
  note: z.string().optional(),
});

export const getOrders = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { startDate, endDate, status } = req.query;

    const where: any = {};
    if (status) {
      where.status = String(status);
    }

    if (startDate || endDate) {
      where.createdAt = {};
      if (startDate) {
        where.createdAt.gte = new Date(String(startDate));
      }
      if (endDate) {
        where.createdAt.lte = new Date(String(endDate));
      }
    }

    const orders = await prisma.order.findMany({
      where,
      include: {
        items: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    res.json({
      success: true,
      data: orders
    });
  } catch (err) {
    next(err);
  }
};

export const getOrderById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id },
      include: {
        items: true
      }
    });

    if (!order) {
      return next(new AppError('Đơn hàng không tồn tại', 404));
    }

    res.json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
};

export const createOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    if (!req.employee) {
      return next(new AppError('Thông tin nhân viên không hợp lệ', 401));
    }

    const validation = createOrderSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { items, totalAmount, discount, finalAmount, paymentMethod, note } = validation.data;

    // Generate unique order number HD-YYYYMMDD-XXXX
    const today = new Date();
    const dateStr = today.getFullYear() + 
      String(today.getMonth() + 1).padStart(2, '0') + 
      String(today.getDate()).padStart(2, '0');
    
    // Count orders created today to generate sequential number
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date();
    endOfToday.setHours(23, 59, 59, 999);

    const todaysOrdersCount = await prisma.order.count({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        }
      }
    });

    const sequentialNum = String(todaysOrdersCount + 1).padStart(3, '0');
    const orderNumber = `HD-${dateStr}-${sequentialNum}`;

    // Perform database transaction
    const newOrder = await prisma.$transaction(async (tx) => {
      // 1. Create the order
      const order = await tx.order.create({
        data: {
          orderNumber,
          totalAmount,
          discount,
          finalAmount,
          paymentMethod,
          note,
          employeeId: req.employee!.id,
          employeeName: req.employee!.name,
        }
      });

      // 2. Create order items and decrease stocks if applicable
      for (const item of items) {
        // Resolve product details to snapshot name
        const product = await tx.product.findUnique({
          where: { id: item.productId }
        });

        if (!product) {
          throw new AppError(`Sản phẩm với ID ${item.productId} không tồn tại`, 400);
        }

        await tx.orderItem.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            productName: product.name,
            size: item.size,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            toppings: item.toppings ? JSON.stringify(item.toppings) : null,
            totalPrice: item.totalPrice
          }
        });

        // 3. Simple warehouse deduction rule (optional feature):
        // If a product maps to an inventory item, we can deduct it.
        // For standard items, let's keep it simple: try to find an inventory item with matching product name
        // (e.g. coffee beans for coffee) and deduct a standard amount (e.g., 0.02 kg per cup).
        // Let's implement it robustly in Phase 2 or keep a placeholder hook here.
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: { items: true }
      });
    });

    res.status(201).json({
      success: true,
      data: newOrder
    });
  } catch (err) {
    next(err);
  }
};

export const cancelOrder = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const order = await prisma.order.findUnique({
      where: { id }
    });

    if (!order) {
      return next(new AppError('Đơn hàng không tồn tại', 404));
    }

    if (order.status === 'cancelled') {
      return next(new AppError('Đơn hàng đã được hủy trước đó', 400));
    }

    const updatedOrder = await prisma.order.update({
      where: { id },
      data: {
        status: 'cancelled'
      }
    });

    // Option: return items back to inventory if they were deducted.
    // (To be covered in inventory system phase)

    res.json({
      success: true,
      data: updatedOrder,
      message: 'Đã hủy đơn hàng thành công'
    });
  } catch (err) {
    next(err);
  }
};
