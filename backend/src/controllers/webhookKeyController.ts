import { Response } from 'express';
import crypto from 'crypto';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

/**
 * Generate a new API key for the owner's hostel
 */
export const generateApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user?.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    const apiKey = crypto.randomBytes(32).toString('hex'); // 64-char hex string

    const [id] = await db('webhook_api_keys').insert({
      hostel_id: user.hostel_id,
      api_key: apiKey,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'API key generated successfully',
      data: {
        id,
        api_key: apiKey,
        is_active: 1,
        created_at: new Date()
      }
    });
  } catch (error) {
    console.error('Generate API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate API key'
    });
  }
};

/**
 * List all API keys for the owner's hostel
 */
export const getApiKeys = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    if (!user?.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    const keys = await db('webhook_api_keys')
      .select('id', 'api_key', 'is_active', 'last_used_at', 'created_at')
      .where({ hostel_id: user.hostel_id })
      .orderBy('created_at', 'desc');

    res.json({
      success: true,
      data: keys
    });
  } catch (error) {
    console.error('Get API keys error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch API keys'
    });
  }
};

/**
 * Deactivate an API key
 */
export const deactivateApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { keyId } = req.params;

    if (!user?.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    const key = await db('webhook_api_keys')
      .where({ id: keyId, hostel_id: user.hostel_id })
      .first();

    if (!key) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    await db('webhook_api_keys')
      .where({ id: keyId })
      .update({ is_active: 0, updated_at: new Date() });

    res.json({
      success: true,
      message: 'API key deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to deactivate API key'
    });
  }
};

/**
 * Delete an API key permanently
 */
export const deleteApiKey = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const { keyId } = req.params;

    if (!user?.hostel_id) {
      return res.status(403).json({
        success: false,
        error: 'Your account is not linked to any hostel.'
      });
    }

    const key = await db('webhook_api_keys')
      .where({ id: keyId, hostel_id: user.hostel_id })
      .first();

    if (!key) {
      return res.status(404).json({
        success: false,
        error: 'API key not found'
      });
    }

    await db('webhook_api_keys')
      .where({ id: keyId })
      .delete();

    res.json({
      success: true,
      message: 'API key deleted successfully'
    });
  } catch (error) {
    console.error('Delete API key error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete API key'
    });
  }
};
