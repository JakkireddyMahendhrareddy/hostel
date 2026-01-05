import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Get all fee categories for a hostel
export const getFeeCategories = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.query;
    const user = req.user;

    let query = db('fee_structure as fs')
      .leftJoin('hostel_master as h', 'fs.hostel_id', 'h.hostel_id')
      .select(
        'fs.fee_structure_id',
        'fs.hostel_id',
        'h.hostel_name',
        'fs.fee_type',
        'fs.amount',
        'fs.frequency',
        'fs.is_active',
        'fs.created_at',
        'fs.updated_at'
      )
      .where('fs.is_active', 1);

    // If user is hostel owner, filter by their hostels
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');

      const hostelIds = ownerHostels.map(h => h.hostel_id);
      query = query.whereIn('fs.hostel_id', hostelIds);
    }

    // Apply hostel filter if provided
    if (hostelId) {
      query = query.where('fs.hostel_id', hostelId);
    }

    const categories = await query.orderBy('fs.hostel_id').orderBy('fs.fee_type');

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Get fee categories error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee categories'
    });
  }
};

// Get a single fee category by ID
export const getFeeCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    let query = db('fee_structure as fs')
      .leftJoin('hostel_master as h', 'fs.hostel_id', 'h.hostel_id')
      .select(
        'fs.fee_structure_id',
        'fs.hostel_id',
        'h.hostel_name',
        'fs.fee_type',
        'fs.amount',
        'fs.frequency',
        'fs.is_active',
        'fs.created_at',
        'fs.updated_at'
      )
      .where('fs.fee_structure_id', id);

    // If user is hostel owner, verify they own this hostel
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');

      const hostelIds = ownerHostels.map(h => h.hostel_id);
      query = query.whereIn('fs.hostel_id', hostelIds);
    }

    const category = await query.first();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Fee category not found'
      });
    }

    res.json({
      success: true,
      data: category
    });
  } catch (error) {
    console.error('Get fee category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee category'
    });
  }
};

// Create new fee category
export const createFeeCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { hostel_id, fee_type, amount, frequency } = req.body;
    const user = req.user;

    // Validate required fields
    if (!hostel_id || !fee_type || !amount || !frequency) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: hostel_id, fee_type, amount, frequency'
      });
    }

    // Validate frequency enum
    const validFrequencies = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'];
    if (!validFrequencies.includes(frequency)) {
      return res.status(400).json({
        success: false,
        error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
      });
    }

    // If user is hostel owner, verify they own this hostel
    if (user?.role_id === 2) {
      const hostel = await db('hostel_master')
        .where({ hostel_id, owner_id: user.user_id })
        .first();

      if (!hostel) {
        return res.status(403).json({
          success: false,
          error: 'You do not have permission to add categories to this hostel'
        });
      }
    }

    // Check for duplicate fee type in same hostel
    const existing = await db('fee_structure')
      .where({ hostel_id, fee_type, is_active: 1 })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Fee category "${fee_type}" already exists for this hostel`
      });
    }

    // Insert new category
    const [categoryId] = await db('fee_structure').insert({
      hostel_id,
      fee_type,
      amount,
      frequency,
      is_active: 1,
      created_at: new Date(),
      updated_at: new Date()
    });

    res.status(201).json({
      success: true,
      message: 'Fee category created successfully',
      data: {
        fee_structure_id: categoryId,
        hostel_id,
        fee_type,
        amount,
        frequency
      }
    });
  } catch (error) {
    console.error('Create fee category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to create fee category'
    });
  }
};

// Update fee category
export const updateFeeCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { fee_type, amount, frequency, is_active } = req.body;
    const user = req.user;

    // Validate frequency if provided
    if (frequency) {
      const validFrequencies = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly', 'One-Time'];
      if (!validFrequencies.includes(frequency)) {
        return res.status(400).json({
          success: false,
          error: `Invalid frequency. Must be one of: ${validFrequencies.join(', ')}`
        });
      }
    }

    // Get existing category
    let query = db('fee_structure')
      .where('fee_structure_id', id);

    // If user is hostel owner, verify they own this hostel
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');

      const hostelIds = ownerHostels.map(h => h.hostel_id);
      query = query.whereIn('hostel_id', hostelIds);
    }

    const category = await query.first();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Fee category not found or you do not have permission'
      });
    }

    // Check for duplicate fee type if changing name
    if (fee_type && fee_type !== category.fee_type) {
      const existing = await db('fee_structure')
        .where({
          hostel_id: category.hostel_id,
          fee_type,
          is_active: 1
        })
        .whereNot('fee_structure_id', id)
        .first();

      if (existing) {
        return res.status(409).json({
          success: false,
          error: `Fee category "${fee_type}" already exists for this hostel`
        });
      }
    }

    // Build update object
    const updateData: any = {
      updated_at: new Date()
    };

    if (fee_type !== undefined) updateData.fee_type = fee_type;
    if (amount !== undefined) updateData.amount = amount;
    if (frequency !== undefined) updateData.frequency = frequency;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update category
    await db('fee_structure')
      .where('fee_structure_id', id)
      .update(updateData);

    res.json({
      success: true,
      message: 'Fee category updated successfully'
    });
  } catch (error) {
    console.error('Update fee category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update fee category'
    });
  }
};

// Delete fee category (soft delete)
export const deleteFeeCategory = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const user = req.user;

    // Get existing category
    let query = db('fee_structure')
      .where('fee_structure_id', id);

    // If user is hostel owner, verify they own this hostel
    if (user?.role_id === 2) {
      const ownerHostels = await db('hostel_master')
        .where({ owner_id: user.user_id })
        .select('hostel_id');

      const hostelIds = ownerHostels.map(h => h.hostel_id);
      query = query.whereIn('hostel_id', hostelIds);
    }

    const category = await query.first();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: 'Fee category not found or you do not have permission'
      });
    }

    // Check if category is being used in student_dues
    const duesUsingCategory = await db('student_dues')
      .where('fee_category_id', id)
      .count('* as count')
      .first();

    if (duesUsingCategory && parseInt(duesUsingCategory.count as string) > 0) {
      // Soft delete - just mark as inactive
      await db('fee_structure')
        .where('fee_structure_id', id)
        .update({
          is_active: 0,
          updated_at: new Date()
        });

      return res.json({
        success: true,
        message: 'Fee category deactivated (linked to existing dues)'
      });
    }

    // Hard delete if not used
    await db('fee_structure')
      .where('fee_structure_id', id)
      .delete();

    res.json({
      success: true,
      message: 'Fee category deleted successfully'
    });
  } catch (error) {
    console.error('Delete fee category error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete fee category'
    });
  }
};
