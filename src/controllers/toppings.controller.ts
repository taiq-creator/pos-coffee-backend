import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const toppingSchema = z.object({
  name: z.string().min(1, 'Tên topping không được để trống'),
  price: z.number().int().nonnegative('Giá phải lớn hơn hoặc bằng 0'),
  isActive: z.boolean().default(true),
});

export const getToppings = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const toppings = await prisma.topping.findMany({
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: toppings
    });
  } catch (err) {
    next(err);
  }
};

export const createTopping = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = toppingSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { name, price, isActive } = validation.data;

    const existingTopping = await prisma.topping.findFirst({
      where: { name }
    });

    if (existingTopping) {
      return next(new AppError('Topping này đã tồn tại', 400));
    }

    const newTopping = await prisma.topping.create({
      data: {
        name,
        price,
        isActive
      }
    });

    res.status(201).json({
      success: true,
      data: newTopping
    });
  } catch (err) {
    next(err);
  }
};

export const updateTopping = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = toppingSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const topping = await prisma.topping.findUnique({
      where: { id }
    });

    if (!topping) {
      return next(new AppError('Topping không tồn tại', 404));
    }

    const updatedTopping = await prisma.topping.update({
      where: { id },
      data: validation.data
    });

    res.json({
      success: true,
      data: updatedTopping
    });
  } catch (err) {
    next(err);
  }
};

export const deleteTopping = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const topping = await prisma.topping.findUnique({
      where: { id }
    });

    if (!topping) {
      return next(new AppError('Topping không tồn tại', 404));
    }

    await prisma.topping.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Đã xóa topping thành công'
    });
  } catch (err) {
    next(err);
  }
};
