import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { errorHandler } from './middleware/error.middleware';

// Routes imports
import authRoutes from './routes/employees.routes'; // Shared /me profile and admin employee config
import categoryRoutes from './routes/categories.routes';
import productRoutes from './routes/products.routes';
import toppingRoutes from './routes/toppings.routes';
import orderRoutes from './routes/orders.routes';
import inventoryRoutes from './routes/inventory.routes';
import reportRoutes from './routes/reports.routes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}));
app.use(express.json());

// Base health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date(),
    service: 'POS Coffee Shop Backend'
  });
});

// Bind Endpoints
app.use('/api/employees', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/products', productRoutes);
app.use('/api/toppings', toppingRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/inventory', inventoryRoutes);
app.use('/api/reports', reportRoutes);

// Global Error Handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`[Server] POS Backend is running on port ${PORT}`);
});
