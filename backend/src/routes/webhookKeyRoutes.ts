import { Router } from 'express';
import {
  generateApiKey,
  getApiKeys,
  deactivateApiKey,
  deleteApiKey
} from '../controllers/webhookKeyController.js';
import { authMiddleware } from '../middleware/auth.js';

const router = Router();

// All routes require authentication (owner must be logged in)
router.post('/generate', authMiddleware, generateApiKey);
router.get('/', authMiddleware, getApiKeys);
router.put('/:keyId/deactivate', authMiddleware, deactivateApiKey);
router.delete('/:keyId', authMiddleware, deleteApiKey);

export default router;
