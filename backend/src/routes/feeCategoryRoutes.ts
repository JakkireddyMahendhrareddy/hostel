import express from 'express';
import { authMiddleware } from '../middleware/auth.js';
import {
  getFeeCategories,
  getFeeCategory,
  createFeeCategory,
  updateFeeCategory,
  deleteFeeCategory
} from '../controllers/feeCategoryController.js';

const router = express.Router();

// All routes require authentication
router.use(authMiddleware);

// GET /api/fee-categories - Get all fee categories (with optional hostel filter)
router.get('/', getFeeCategories);

// GET /api/fee-categories/:id - Get single fee category
router.get('/:id', getFeeCategory);

// POST /api/fee-categories - Create new fee category
router.post('/', createFeeCategory);

// PUT /api/fee-categories/:id - Update fee category
router.put('/:id', updateFeeCategory);

// DELETE /api/fee-categories/:id - Delete/deactivate fee category
router.delete('/:id', deleteFeeCategory);

export default router;
