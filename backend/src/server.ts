import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import hostelRoutes from './routes/hostel.routes.js';
import userRoutes from './routes/user.routes.js';
import roomRoutes from './routes/roomRoutes.js';
import studentRoutes from './routes/studentRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import monthlyFeeRoutes from './routes/monthlyFeeRoutes.js';
import incomeRoutes from './routes/incomeRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import activityRoutes from './routes/activityRoutes.js';
import amenitiesRoutes from './routes/amenities.routes.js';
import relationsRoutes from './routes/relationsRoutes.js';
import idProofTypesRoutes from './routes/idProofTypesRoutes.js';
import { startMonthlyFeesGenerationJob } from './jobs/monthlyFeesGeneration.js';

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 8081;

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/hostels', hostelRoutes);
app.use('/api/users', userRoutes);
app.use('/api/rooms', roomRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/monthly-fees', monthlyFeeRoutes);
app.use('/api/income', incomeRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/analytics', reportRoutes);
app.use('/api/activity', activityRoutes);
app.use('/api/amenities', amenitiesRoutes);
app.use('/api/relations', relationsRoutes);
app.use('/api/id-proof-types', idProofTypesRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    success: true,
    message: 'Server is running',
    timestamp: new Date().toISOString(),
  });
});

// Root route
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Hostel Management API',
    version: '1.0.0',
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: 'Route not found',
  });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📚 API docs available at http://localhost:${PORT}/api`);
  console.log(`🔐 Environment: ${process.env.NODE_ENV || 'development'}`);

  // Start cron jobs
  startMonthlyFeesGenerationJob();
  console.log(`⏰ Cron jobs initialized`);
});

export default app;
