import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';
import { z } from 'zod';

const productSchema = z.object({
  name: z.string().min(1, 'Tên sản phẩm không được để trống'),
  categoryId: z.string().min(1, 'Danh mục không được để trống'),
  priceS: z.number().int().nonnegative().nullable().optional(),
  priceM: z.number().int().nonnegative('Giá size M phải lớn hơn hoặc bằng 0'),
  priceL: z.number().int().nonnegative().nullable().optional(),
  image: z.string().url('URL ảnh không hợp lệ').or(z.string().length(0)).nullable().optional(),
  isAvailable: z.boolean().default(true),
});

export const getProducts = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { categoryId, isAvailable } = req.query;

    const where: any = {};
    if (categoryId) {
      where.categoryId = String(categoryId);
    }
    if (isAvailable !== undefined) {
      where.isAvailable = isAvailable === 'true';
    }

    const products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: {
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    });

    res.json({
      success: true,
      data: products
    });
  } catch (err) {
    next(err);
  }
};

export const getProductById = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: {
          select: {
            name: true
          }
        }
      }
    });

    if (!product) {
      return next(new AppError('Sản phẩm không tồn tại', 404));
    }

    res.json({
      success: true,
      data: product
    });
  } catch (err) {
    next(err);
  }
};

export const createProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const validation = productSchema.safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const { name, categoryId, priceS, priceM, priceL, image, isAvailable } = validation.data;

    // Verify category exists
    const category = await prisma.category.findUnique({
      where: { id: categoryId }
    });
    if (!category) {
      return next(new AppError('Danh mục sản phẩm không tồn tại', 400));
    }

    const existingProduct = await prisma.product.findFirst({
      where: { name }
    });
    if (existingProduct) {
      return next(new AppError('Sản phẩm với tên này đã tồn tại', 400));
    }

    const newProduct = await prisma.product.create({
      data: {
        name,
        categoryId,
        priceS,
        priceM,
        priceL,
        image: image || null,
        isAvailable
      }
    });

    res.status(201).json({
      success: true,
      data: newProduct
    });
  } catch (err) {
    next(err);
  }
};

export const updateProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;
    const validation = productSchema.partial().safeParse(req.body);
    if (!validation.success) {
      return next(new AppError(validation.error.errors[0].message, 400));
    }

    const product = await prisma.product.findUnique({
      where: { id }
    });
    if (!product) {
      return next(new AppError('Sản phẩm không tồn tại', 404));
    }

    if (validation.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: validation.data.categoryId }
      });
      if (!category) {
        return next(new AppError('Danh mục sản phẩm không tồn tại', 400));
      }
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: {
        ...validation.data,
        image: validation.data.image || null,
      }
    });

    res.json({
      success: true,
      data: updatedProduct
    });
  } catch (err) {
    next(err);
  }
};

export const deleteProduct = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { id } = req.params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { orderItems: true }
        }
      }
    });

    if (!product) {
      return next(new AppError('Sản phẩm không tồn tại', 404));
    }

    // Instead of deleting hard, we can soft delete or throw error if it has references
    if (product._count.orderItems > 0) {
      // If product has been ordered, we should disable it instead of hard deleting
      await prisma.product.update({
        where: { id },
        data: { isAvailable: false }
      });
      return res.json({
        success: true,
        message: 'Sản phẩm đã có lịch sử đơn hàng. Hệ thống đã chuyển trạng thái thành Ngừng kinh doanh thay vì xóa cứng.'
      });
    }

    await prisma.product.delete({
      where: { id }
    });

    res.json({
      success: true,
      message: 'Đã xóa sản phẩm thành công'
    });
  } catch (err) {
    next(err);
  }
};
