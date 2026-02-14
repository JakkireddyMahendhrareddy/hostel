import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { handleGoogleFormSubmission } from '../controllers/webhookController.js';

const router = Router();

// Rate limiting: 30 requests per 15 minutes per IP
const webhookRateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30,
  message: {
    success: false,
    error: 'Too many requests. Please try again later.'
  },
  standardHeaders: true,
  legacyHeaders: false
});

// Public route - NO auth middleware, protected by API key in the controller
router.post('/google-form', webhookRateLimiter, handleGoogleFormSubmission);

export default router;
