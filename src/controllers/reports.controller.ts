import { Response, NextFunction } from 'express';
import { prisma } from '../lib/prisma';
import { AuthenticatedRequest } from '../middleware/auth.middleware';
import { AppError } from '../middleware/error.middleware';

export const getSummary = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const today = new Date();
    const startOfToday = new Date(today);
    startOfToday.setHours(0, 0, 0, 0);
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);

    // 1. Today's Revenue and Completed Orders
    const todaysOrders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startOfToday,
          lte: endOfToday
        },
        status: 'completed'
      }
    });

    const revenueToday = todaysOrders.reduce((sum, order) => sum + order.finalAmount, 0);
    const completedOrdersCount = todaysOrders.length;

    // 2. Count low inventory items
    const lowStockCount = await prisma.inventoryItem.count({
      where: {
        quantity: {
          lte: prisma.inventoryItem.fields.minQuantity
        },
        isActive: true
      }
    });

    // 3. Top products sold today (limit 5)
    const orderItems = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: startOfToday,
            lte: endOfToday
          },
          status: 'completed'
        }
      },
      select: {
        productName: true,
        quantity: true
      }
    });

    const productSalesMap: Record<string, number> = {};
    orderItems.forEach(item => {
      productSalesMap[item.productName] = (productSalesMap[item.productName] || 0) + item.quantity;
    });

    const topProductsToday = Object.entries(productSalesMap)
      .map(([name, quantity]) => ({ name, quantity }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    res.json({
      success: true,
      data: {
        revenueToday,
        completedOrdersCount,
        lowStockCount,
        topProductsToday
      }
    });
  } catch (err) {
    next(err);
  }
};

export const getRevenueReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days = '7' } = req.query;
    const daysLimit = parseInt(String(days), 10);

    const today = new Date();
    const startDate = new Date();
    startDate.setDate(today.getDate() - daysLimit + 1);
    startDate.setHours(0, 0, 0, 0);

    // Fetch all completed orders in range
    const orders = await prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate
        },
        status: 'completed'
      },
      select: {
        finalAmount: true,
        createdAt: true
      },
      orderBy: {
        createdAt: 'asc'
      }
    });

    // Aggregate by date (YYYY-MM-DD)
    const revenueMap: Record<string, number> = {};
    
    // Initialize map with all dates in range
    for (let i = 0; i < daysLimit; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      revenueMap[dateKey] = 0;
    }

    orders.forEach(order => {
      const dateKey = order.createdAt.toISOString().split('T')[0];
      if (revenueMap[dateKey] !== undefined) {
        revenueMap[dateKey] += order.finalAmount;
      }
    });

    const chartData = Object.entries(revenueMap).map(([date, revenue]) => ({
      date,
      revenue
    }));

    res.json({
      success: true,
      data: chartData
    });
  } catch (err) {
    next(err);
  }
};

export const getTopProductsReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days = '30' } = req.query;
    const daysLimit = parseInt(String(days), 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysLimit);
    startDate.setHours(0, 0, 0, 0);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: startDate
          },
          status: 'completed'
        }
      },
      select: {
        productName: true,
        quantity: true,
        totalPrice: true
      }
    });

    const productSalesMap: Record<string, { quantity: number; revenue: number }> = {};
    
    items.forEach(item => {
      if (!productSalesMap[item.productName]) {
        productSalesMap[item.productName] = { quantity: 0, revenue: 0 };
      }
      productSalesMap[item.productName].quantity += item.quantity;
      productSalesMap[item.productName].revenue += item.totalPrice;
    });

    const topProducts = Object.entries(productSalesMap)
      .map(([name, data]) => ({
        name,
        quantity: data.quantity,
        revenue: data.revenue
      }))
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 10);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (err) {
    next(err);
  }
};

export const getByCategoryReport = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const { days = '30' } = req.query;
    const daysLimit = parseInt(String(days), 10);

    const startDate = new Date();
    startDate.setDate(startDate.getDate() - daysLimit);
    startDate.setHours(0, 0, 0, 0);

    const items = await prisma.orderItem.findMany({
      where: {
        order: {
          createdAt: {
            gte: startDate
          },
          status: 'completed'
        }
      },
      include: {
        product: {
          include: {
            category: true
          }
        }
      }
    });

    const categoryMap: Record<string, number> = {};

    items.forEach(item => {
      const categoryName = item.product?.category?.name || 'Khác';
      categoryMap[categoryName] = (categoryMap[categoryName] || 0) + item.totalPrice;
    });

    const breakdown = Object.entries(categoryMap).map(([name, value]) => ({
      name,
      value
    }));

    res.json({
      success: true,
      data: breakdown
    });
  } catch (err) {
    next(err);
  }
};
