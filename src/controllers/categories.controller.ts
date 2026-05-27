import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const categorySchema = z.object({
  name: z.string().min(1, 'Tên danh mục không được để trống'),
  icon: z.string().optional(),
  sortOrder: z.number().int().default(0),
  isActive: z.boolean().default(true),
});

export const getCategories = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.category.findMany({
      orderBy: {
        sortOrder: 'asc'
      }
    });

    res.json({
      success: true,
      data: categories
    });
  } catch (err) {
    next(err);
  }
};

export const createCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = categorySchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { name, icon, sortOrder, isActive } = validation.data;

    const existingCategory = await prisma.category.findFirst({
      where: { name }
    });

    if (existingCategory) {
      return next(new AppError('Danh mục này đã tồn tại', 400));
    }

    const newCategory = await prisma.category.create({
      data: {
        name,
        icon,
        sortOrder,
        isActive
      }
    });

    res.status(201).json({
      success: true,
      data: newCategory
    });
  } catch (err) {
    next(err);
  }
};

export const updateCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = categorySchema.partial().safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const category = await prisma.category.findUnique({
      where: { id }
    });

    if (!category) {
      return next(new AppError('Danh mục không tồn tại', 404));
    }

    const updatedCategory = await prisma.category.update({
      where: { id },
      data: validation.data
    });

    res.json({
      success: true,
      data: updatedCategory
    });
  } catch (err) {
    next(err);
  }
};

export const deleteCategory = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: true }
        }
      }
    });

    if (!category) {
      return next(new AppError('Danh mục không tồn tại', 404));
    }

    if (category._count.products > 0) {
      return next(new AppError('Không thể xóa danh mục đang có sản phẩm. Vui lòng chuyển các sản phẩm sang danh mục khác trước.', 400));
    }

    await prisma.category.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Đã xóa danh mục thành công'
    });
  } catch (err) {
    next(err);
  }
};
