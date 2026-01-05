import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getFeePayments,
  getStudentDues,
  getAllStudentsWithDues,
  getStudentPaymentHistory,
  recordPayment,
  getPaymentModes,
  generateMonthlyDues,
  getReceipt,
  getAvailableMonths,
  manualTriggerDuesGeneration,
  updateStudentDueDate
} from '../controllers/feeController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// Fee/Payment routes
router.get('/payments', getFeePayments);
router.get('/dues', getStudentDues);
router.get('/all-students', getAllStudentsWithDues);
router.get('/available-months', getAvailableMonths);
router.get('/student/:studentId/payments', getStudentPaymentHistory);
router.post('/payments', recordPayment);
router.get('/payment-modes', getPaymentModes);
router.post('/generate-dues', generateMonthlyDues);
router.post('/trigger-monthly-dues', manualTriggerDuesGeneration);
router.get('/receipts/:paymentId', getReceipt);
router.put('/student/:studentId/due-date', updateStudentDueDate);

export default router;
