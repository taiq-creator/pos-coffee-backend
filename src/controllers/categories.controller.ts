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
      where: { isActive: true },
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

    // Fetch category along with its products and their orderItems count
    const category = await prisma.category.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            _count: {
              select: { orderItems: true }
            }
          }
        }
      }
    });

    if (!category) {
      return next(new AppError('Danh mục không tồn tại', 404));
    }

    // Check if any product in this category has been ordered in the past
    const hasOrders = category.products.some(p => p._count.orderItems > 0);

    if (hasOrders) {
      // If there are past orders, perform soft-delete by deactivating category and products
      await prisma.$transaction([
        // Deactivate all products belonging to this category
        prisma.product.updateMany({
          where: { categoryId: id },
          data: { isAvailable: false }
        }),
        // Deactivate the category itself
        prisma.category.update({
          where: { id },
          data: { isActive: false }
        })
      ]);

      return res.json({
        success: true,
        message: 'Danh mục này đã có lịch sử hóa đơn. Hệ thống đã tự động ẩn (ngừng hoạt động) danh mục và các sản phẩm liên quan để bảo toàn báo cáo doanh thu.'
      });
    }

    // If there are no past orders (like in testing mode), safely cascade delete everything
    await prisma.$transaction([
      // Hard delete all products under this category
      prisma.product.deleteMany({
        where: { categoryId: id }
      }),
      // Hard delete the category itself
      prisma.category.delete({
        where: { id }
      })
    ]);

    res.json({
      success: true,
      message: 'Đã xóa hoàn toàn danh mục và các sản phẩm liên quan thành công.'
    });
  } catch (err) {
    next(err);
  }
};
