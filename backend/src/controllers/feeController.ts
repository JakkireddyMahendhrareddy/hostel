import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';
import { triggerManualDuesGeneration } from '../jobs/monthlyDuesGeneration.js';

// Get all fee payments
export const getFeePayments = async (req: AuthRequest, res: Response) => {
  console.log('[getFeePayments] Request received');
  console.log('[getFeePayments] Query params:', req.query);
  console.log('[getFeePayments] User:', req.user);
  try {
    const { hostelId, studentId, startDate, endDate } = req.query;
    const user = req.user;
    console.log('[getFeePayments] Filters - hostelId:', hostelId, 'studentId:', studentId, 'user.role_id:', user?.role_id, 'user.hostel_id:', user?.hostel_id);

    let query = db('student_fee_payments as sfp')
      .leftJoin('students as s', 'sfp.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'sfp.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'sfp.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'sfp.*',
        's.first_name',
        's.last_name',
        's.phone',
        'h.hostel_name',
        'pm.payment_mode_name as payment_mode'
      );

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('sfp.hostel_id', user.hostel_id);
    }

    // Apply filters
    if (hostelId) {
      query = query.where('sfp.hostel_id', hostelId);
    }

    if (studentId) {
      query = query.where('sfp.student_id', studentId);
    }

    if (startDate && endDate) {
      query = query.whereBetween('sfp.payment_date', [startDate, endDate]);
    }

    console.log('[getFeePayments] Executing query...');
    const payments = await query.orderBy('sfp.payment_date', 'desc');
    console.log(`[getFeePayments] Query completed. Found ${payments.length} payment records`);

    res.json({
      success: true,
      data: payments
    });
    console.log('[getFeePayments] Response sent successfully');
  } catch (error: any) {
    console.error('[getFeePayments] Error:', error);
    console.error('[getFeePayments] Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch fee payments',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get student dues
export const getStudentDues = async (req: AuthRequest, res: Response) => {
  console.log('[getStudentDues] Request received');
  console.log('[getStudentDues] Query params:', req.query);
  console.log('[getStudentDues] User:', req.user);
  try {
    const { hostelId } = req.query;
    const user = req.user;
    console.log('[getStudentDues] hostelId:', hostelId, 'user.role_id:', user?.role_id, 'user.hostel_id:', user?.hostel_id);

    let query = db('student_dues as sd')
      .leftJoin('students as s', 'sd.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'sd.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        'sd.*',
        's.first_name',
        's.last_name',
        's.phone',
        's.floor_number',
        'h.hostel_name',
        'r.room_number',
        's.monthly_rent'
      )
      .where('sd.is_paid', 0)
      .where('s.status', 'Active');

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('sd.hostel_id', user.hostel_id);
    }

    if (hostelId) {
      query = query.where('sd.hostel_id', hostelId);
    }

    console.log('[getStudentDues] Executing query...');
    const dues = await query.orderBy('sd.due_date', 'asc');
    console.log(`[getStudentDues] Query completed. Found ${dues.length} dues records`);

    // Group by student
    const groupedDues = dues.reduce((acc: any, due: any) => {
      const key = due.student_id;
      if (!acc[key]) {
        acc[key] = {
          student_id: due.student_id,
          student_name: `${due.first_name} ${due.last_name || ''}`.trim(),
          phone: due.phone,
          hostel_name: due.hostel_name,
          room_number: due.room_number,
          floor_number: due.floor_number,
          monthly_rent: due.monthly_rent,
          total_dues: 0,
          dues: []
        };
      }
      acc[key].total_dues += parseFloat(due.due_amount || 0);
      acc[key].dues.push({
        due_id: due.due_id,
        due_month: due.due_month,
        due_amount: parseFloat(due.due_amount || 0),
        due_date: due.due_date
      });
      return acc;
    }, {});

    const result = Object.values(groupedDues);
    console.log(`[getStudentDues] Grouped into ${result.length} students`);

    res.json({
      success: true,
      data: result
    });
  } catch (error: any) {
    console.error('[getStudentDues] Error:', error);
    console.error('[getStudentDues] Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student dues',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get ALL students with their complete dues information (paid + unpaid)
export const getAllStudentsWithDues = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId, month } = req.query;
    const user = req.user;

    // Get current month if not specified
    const selectedMonth = month as string || `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;

    // Build query for active students
    let studentsQuery = db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.student_id',
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        's.hostel_id',
        's.floor_number',
        's.admission_date',
        's.due_date',
        'h.hostel_name',
        'r.room_number',
        's.monthly_rent'
      )
      .where('s.status', 'Active');

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      studentsQuery = studentsQuery.where('s.hostel_id', user.hostel_id);
    }

    if (hostelId) {
      studentsQuery = studentsQuery.where('s.hostel_id', hostelId);
    }

    const students = await studentsQuery.orderBy('s.first_name');

    // For each student, get their dues
    const studentsWithDues = await Promise.all(
      students.map(async (student: any) => {
        // Get dues for the selected month with category info
        const dues = await db('student_dues as sd')
          .leftJoin('fee_structure as fs', 'sd.fee_category_id', 'fs.fee_structure_id')
          .select(
            'sd.due_id',
            'sd.due_month',
            'sd.due_amount',
            'sd.paid_amount',
            'sd.balance_amount',
            'sd.due_date',
            'sd.is_paid',
            'sd.is_carried_forward',
            'sd.carried_from_month',
            'fs.fee_type'
          )
          .where('sd.student_id', student.student_id)
          .where('sd.due_month', selectedMonth)
          .orderBy('sd.due_date', 'asc');

        // Calculate totals
        let total_dues = dues
          .filter((d: any) => !d.is_paid)
          .reduce((sum: number, d: any) => sum + parseFloat(d.balance_amount || 0), 0);

        const total_paid = dues
          .reduce((sum: number, d: any) => sum + parseFloat(d.paid_amount || 0), 0);

        const unpaid_dues = dues.filter((d: any) => !d.is_paid);
        const paid_dues = dues.filter((d: any) => d.is_paid);

        // Determine payment status
        let payment_status = 'No Dues';
        if (dues.length === 0) {
          // No dues record exists for this month
          // Check if student has monthly rent - if yes, they should be "Pending" (dues not generated yet)
          if (student.monthly_rent && student.monthly_rent > 0) {
            payment_status = 'Pending';
            // Set total_dues to monthly_rent since no dues record exists yet
            total_dues = parseFloat(student.monthly_rent);
          } else {
            payment_status = 'No Dues';
          }
        } else if (total_dues > 0) {
          // Has unpaid dues
          payment_status = 'Pending';
        } else {
          // All dues are paid (balance = 0)
          payment_status = 'Paid';
        }

        return {
          student_id: student.student_id,
          hostel_id: student.hostel_id,
          student_name: `${student.first_name} ${student.last_name || ''}`.trim(),
          phone: student.phone,
          email: student.email,
          hostel_name: student.hostel_name,
          room_number: student.room_number,
          floor_number: student.floor_number,
          monthly_rent: student.monthly_rent,
          admission_date: student.admission_date,
          due_date: student.due_date,
          total_dues,
          total_paid,
          unpaid_count: unpaid_dues.length,
          paid_count: paid_dues.length,
          payment_status,
          dues: unpaid_dues,
          paid_dues: paid_dues
        };
      })
    );

    res.json({
      success: true,
      data: studentsWithDues
    });
  } catch (error) {
    console.error('Get all students with dues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students with dues'
    });
  }
};

// Get payment history for a specific student
export const getStudentPaymentHistory = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const user = req.user;

    if (!studentId) {
      return res.status(400).json({
        success: false,
        error: 'Student ID is required'
      });
    }

    let query = db('student_fee_payments as sfp')
      .leftJoin('payment_modes as pm', 'sfp.payment_mode_id', 'pm.payment_mode_id')
      .select(
        'sfp.payment_id',
        'sfp.student_id',
        'sfp.payment_date',
        'sfp.amount_paid',
        'sfp.payment_for_month',
        'sfp.receipt_number',
        'sfp.transaction_reference',
        'sfp.remarks',
        'pm.payment_mode_name as payment_mode'
      )
      .where('sfp.student_id', studentId);

    // If user is hostel owner, filter by their current hostel from JWT
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('sfp.hostel_id', user.hostel_id);
    }

    const payments = await query
      .orderBy('sfp.payment_date', 'desc')
      .orderBy('sfp.payment_id', 'desc');

    res.json({
      success: true,
      data: payments
    });
  } catch (error) {
    console.error('Get student payment history error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student payment history'
    });
  }
};

// Record fee payment
export const recordPayment = async (req: AuthRequest, res: Response) => {
  try {
    const {
      student_id,
      hostel_id,
      amount_paid,
      payment_mode_id,
      due_date,
      payment_date,
      transaction_reference,
      remarks
    } = req.body;

    // Validate required fields
    if (!student_id || !hostel_id || !amount_paid || !payment_mode_id) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: student_id, hostel_id, amount_paid, payment_mode_id'
      });
    }

    // Generate receipt number
    const receiptNumber = `RCP${Date.now()}${Math.floor(Math.random() * 1000)}`;

    // Insert payment
    const [payment_id] = await db('student_fee_payments').insert({
      student_id,
      hostel_id,
      payment_date: payment_date || new Date(),
      amount_paid,
      payment_mode_id,
      payment_for_month: null,
      transaction_reference,
      receipt_number: receiptNumber,
      remarks,
      created_by: req.user?.user_id,
      created_at: new Date()
    });

    // Update dues - allocate payment to unpaid dues (oldest first)
    const unpaidDues = await db('student_dues')
      .where({
        student_id,
        hostel_id,
        is_paid: 0
      })
      .orderBy('due_date', 'asc');

    let remainingAmount = parseFloat(amount_paid);

    for (const due of unpaidDues) {
      if (remainingAmount <= 0) break;

      const dueBalance = parseFloat(due.balance_amount);
      const amountToAllocate = Math.min(remainingAmount, dueBalance);
      const newPaidAmount = parseFloat(due.paid_amount) + amountToAllocate;
      const newBalanceAmount = dueBalance - amountToAllocate;
      const isPaid = newBalanceAmount <= 0;

      await db('student_dues')
        .where('due_id', due.due_id)
        .update({
          paid_amount: newPaidAmount,
          balance_amount: Math.max(0, newBalanceAmount),
          is_paid: isPaid ? 1 : 0,
          paid_date: isPaid ? new Date() : null,
          updated_at: new Date()
        });

      remainingAmount -= amountToAllocate;
    }

    res.status(201).json({
      success: true,
      message: 'Payment recorded successfully',
      data: {
        payment_id,
        receipt_number: receiptNumber
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to record payment'
    });
  }
};

// Get payment modes
export const getPaymentModes = async (req: AuthRequest, res: Response) => {
  try {
    // Check if order_index column exists in the table
    const [columns] = await db.raw(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'payment_modes' 
      AND COLUMN_NAME = 'order_index'
    `);

    let paymentModes;

    if (columns && columns.length > 0) {
      // Order by order_index first (using COALESCE to handle NULLs), then by payment_mode_name
      paymentModes = await db('payment_modes')
        .select('*')
        .orderByRaw('COALESCE(order_index, 999999) ASC')
        .orderBy('payment_mode_name', 'asc');
    } else {
      // Fallback to payment_mode_name if order_index column doesn't exist
      paymentModes = await db('payment_modes')
        .select('*')
        .orderBy('payment_mode_name', 'asc');
    }

    res.json({
      success: true,
      data: paymentModes
    });
  } catch (error) {
    console.error('Get payment modes error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch payment modes'
    });
  }
};

// Generate monthly dues for all students (supports multiple fee categories + carry-forward)
export const generateMonthlyDues = async (req: AuthRequest, res: Response) => {
  try {
    const { hostel_id, month_year } = req.body;

    if (!hostel_id || !month_year) {
      return res.status(400).json({
        success: false,
        error: 'Hostel ID and month_year are required'
      });
    }

    // Get all active students with rooms
    const students = await db('students as s')
      .where('s.hostel_id', hostel_id)
      .where('s.status', 'Active')
      .whereNotNull('s.room_id')
      .select(
        's.student_id',
        's.hostel_id',
        's.monthly_rent'
      );

    if (students.length === 0) {
      return res.json({
        success: true,
        message: 'No active students found'
      });
    }

    // Check if dues already generated for this month
    const existing = await db('student_dues')
      .where({ hostel_id, due_month: month_year })
      .first();

    if (existing) {
      return res.status(409).json({
        success: false,
        error: `Dues already generated for ${month_year}`
      });
    }

    // Get all active fee categories for this hostel
    const feeCategories = await db('fee_structure')
      .where({ hostel_id, is_active: 1, frequency: 'Monthly' })
      .select('fee_structure_id', 'fee_type', 'amount');

    if (feeCategories.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'No active monthly fee categories found for this hostel'
      });
    }

    // Calculate due date (15th of current month)
    const [year, month] = month_year.split('-');
    const dueDate = new Date(parseInt(year), parseInt(month) - 1, 15);

    const duesData: any[] = [];
    let totalDuesCreated = 0;
    let totalCarriedForward = 0;

    // For each student
    for (const student of students) {
      // Step 1: Carry forward unpaid dues from previous months
      const unpaidPreviousDues = await db('student_dues')
        .where({
          student_id: student.student_id,
          hostel_id: student.hostel_id,
          is_paid: 0
        })
        .where('due_month', '<', month_year)
        .select('*');

      for (const oldDue of unpaidPreviousDues) {
        // Create carried forward due record
        duesData.push({
          student_id: student.student_id,
          hostel_id: student.hostel_id,
          fee_category_id: oldDue.fee_category_id,
          due_month: month_year,
          due_amount: oldDue.balance_amount,
          paid_amount: 0,
          balance_amount: oldDue.balance_amount,
          due_date: dueDate,
          is_paid: 0,
          is_carried_forward: 1,
          carried_from_month: oldDue.due_month,
          created_at: new Date()
        });
        totalCarriedForward++;
      }

      // Step 2: Create new dues for each fee category
      for (const category of feeCategories) {
        // For Monthly Rent category, use student's room monthly_rent
        const amount = category.fee_type === 'Monthly Rent'
          ? student.monthly_rent
          : category.amount;

        duesData.push({
          student_id: student.student_id,
          hostel_id: student.hostel_id,
          fee_category_id: category.fee_structure_id,
          due_month: month_year,
          due_amount: amount,
          paid_amount: 0,
          balance_amount: amount,
          due_date: dueDate,
          is_paid: 0,
          is_carried_forward: 0,
          carried_from_month: null,
          created_at: new Date()
        });
        totalDuesCreated++;
      }
    }

    // Insert all dues at once
    if (duesData.length > 0) {
      await db('student_dues').insert(duesData);
    }

    res.json({
      success: true,
      message: `Dues generated successfully`,
      data: {
        students_count: students.length,
        categories_count: feeCategories.length,
        new_dues_created: totalDuesCreated,
        carried_forward_dues: totalCarriedForward,
        total_dues_records: duesData.length
      }
    });
  } catch (error) {
    console.error('Generate dues error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate monthly dues'
    });
  }
};

// Get payment receipt
export const getReceipt = async (req: AuthRequest, res: Response) => {
  try {
    const { paymentId } = req.params;

    const payment = await db('student_fee_payments as sfp')
      .leftJoin('students as s', 'sfp.student_id', 's.student_id')
      .leftJoin('hostel_master as h', 'sfp.hostel_id', 'h.hostel_id')
      .leftJoin('payment_modes as pm', 'sfp.payment_mode_id', 'pm.payment_mode_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        'sfp.*',
        's.first_name',
        's.last_name',
        's.phone',
        's.email',
        'h.hostel_name',
        'h.address',
        'h.city',
        'h.contact_number as hostel_contact',
        'pm.payment_mode_name as payment_mode',
        'r.room_number'
      )
      .where('sfp.payment_id', paymentId)
      .first();

    if (!payment) {
      return res.status(404).json({
        success: false,
        error: 'Payment not found'
      });
    }

    res.json({
      success: true,
      data: payment
    });
  } catch (error) {
    console.error('Get receipt error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch receipt'
    });
  }
};

// Get available months with dues data
export const getAvailableMonths = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    let query = db('student_dues')
      .distinct('due_month')
      .orderBy('due_month', 'desc');

    // If user is hostel owner, filter by their hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      query = query.where('hostel_id', user.hostel_id);
    }

    const months = await query;

    res.json({
      success: true,
      data: months.map(m => m.due_month)
    });
  } catch (error) {
    console.error('Get available months error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch available months'
    });
  }
};

// Manually trigger dues generation for current month
export const manualTriggerDuesGeneration = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;

    // Only allow admin or super admin
    if (user?.role_id !== 1 && user?.role_id !== 3) {
      return res.status(403).json({
        success: false,
        error: 'Only administrators can trigger dues generation'
      });
    }

    const results = await triggerManualDuesGeneration();

    res.json({
      success: true,
      message: 'Dues generation triggered successfully',
      data: results
    });
  } catch (error) {
    console.error('Manual trigger dues generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to trigger dues generation'
    });
  }
};

// Update student's monthly due date
export const updateStudentDueDate = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { due_day } = req.body;
    const user = req.user;

    // Validate due_day (1-31)
    const dueDayNum = parseInt(due_day);
    if (!dueDayNum || dueDayNum < 1 || dueDayNum > 31) {
      return res.status(400).json({
        success: false,
        error: 'Due day must be between 1 and 31'
      });
    }

    // Check if student exists and belongs to owner's hostel
    const student = await db('students')
      .where('student_id', studentId)
      .first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // If user is hostel owner, verify student belongs to their hostel
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel.'
        });
      }
      if (student.hostel_id !== user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'You can only update students in your own hostel.'
        });
      }
    }

    // Get current date
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    // Create due_date based on current month and provided day
    // If the day is valid for this month, use current month, otherwise next month
    let dueDate = new Date(year, month, dueDayNum);
    if (dueDate.getDate() !== dueDayNum) {
      // Day doesn't exist in current month (e.g., 31st in February)
      dueDate = new Date(year, month + 1, 1); // Use 1st of next month
    }

    // Update student's due_date
    await db('students')
      .where('student_id', studentId)
      .update({
        due_date: dueDate,
        updated_at: new Date()
      });

    res.json({
      success: true,
      message: `Monthly due date set to day ${dueDayNum} of each month`,
      data: {
        student_id: studentId,
        due_day: dueDayNum,
        due_date: dueDate
      }
    });
  } catch (error) {
    console.error('Update student due date error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update due date'
    });
  }
};
