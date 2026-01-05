import cron from 'node-cron';
import db from '../config/database.js';

/**
 * Cron Job: Automatic Monthly Dues Generation
 *
 * Schedule: Runs on the 1st of every month at 12:01 AM
 * Pattern: '1 0 1 * *' (minute hour day month dayOfWeek)
 *
 * What it does:
 * - Fetches all active hostels
 * - For each hostel, generates monthly dues for all active students
 * - Creates dues for all fee categories (Rent, Electricity, Maintenance, etc.)
 * - Carries forward unpaid dues from previous months
 */

interface FeeCategory {
  fee_structure_id: number;
  fee_type: string;
  amount: number;
}

interface Student {
  student_id: number;
  hostel_id: number;
  monthly_rent: number;
}

const generateDuesForHostel = async (hostel_id: number, month_year: string) => {
  try {
    console.log(`[Cron] Generating dues for hostel ${hostel_id}, month: ${month_year}`);

    // Check if dues already generated for this month
    const existing = await db('student_dues')
      .where({ hostel_id, due_month: month_year })
      .first();

    if (existing) {
      console.log(`[Cron] Dues already exist for hostel ${hostel_id}, month: ${month_year}`);
      return { skipped: true, reason: 'already_exists' };
    }

    // Get all active students with room allocations
    const students: Student[] = await db('students as s')
      .join('room_allocations as ra', function() {
        this.on('s.student_id', '=', 'ra.student_id')
          .andOn('ra.is_active', '=', db.raw('1'));
      })
      .where('s.hostel_id', hostel_id)
      .where('s.status', 'Active')
      .select(
        's.student_id',
        's.hostel_id',
        'ra.monthly_rent'
      );

    if (students.length === 0) {
      console.log(`[Cron] No active students found for hostel ${hostel_id}`);
      return { skipped: true, reason: 'no_students' };
    }

    // Get all active fee categories for this hostel
    const feeCategories: FeeCategory[] = await db('fee_structure')
      .where({ hostel_id, is_active: 1, frequency: 'Monthly' })
      .select('fee_structure_id', 'fee_type', 'amount');

    if (feeCategories.length === 0) {
      console.log(`[Cron] No active fee categories found for hostel ${hostel_id}`);
      return { skipped: true, reason: 'no_categories' };
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

    // Insert all dues
    if (duesData.length > 0) {
      await db('student_dues').insert(duesData);
    }

    console.log(`[Cron] ✓ Dues generated for hostel ${hostel_id}:`, {
      students: students.length,
      categories: feeCategories.length,
      new_dues: totalDuesCreated,
      carried_forward: totalCarriedForward,
      total: duesData.length
    });

    return {
      success: true,
      students_count: students.length,
      categories_count: feeCategories.length,
      new_dues_created: totalDuesCreated,
      carried_forward_dues: totalCarriedForward,
      total_dues_records: duesData.length
    };
  } catch (error) {
    console.error(`[Cron] Error generating dues for hostel ${hostel_id}:`, error);
    return { error: true, message: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const startMonthlyDuesGenerationJob = () => {
  // Schedule: Run at 12:01 AM on the 1st of every month
  // Cron pattern: '1 0 1 * *'
  // minute(1) hour(0=midnight) day(1=first) month(*=every) dayOfWeek(*=any)

  const job = cron.schedule('1 0 1 * *', async () => {
    console.log('===========================================');
    console.log('[Cron] Monthly Dues Generation Started');
    console.log('[Cron] Time:', new Date().toISOString());
    console.log('===========================================');

    try {
      // Get current month in YYYY-MM format
      const now = new Date();
      const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

      console.log(`[Cron] Generating dues for month: ${month_year}`);

      // Get all active hostels
      const hostels = await db('hostel_master')
        .where('is_active', 1)
        .select('hostel_id', 'hostel_name');

      console.log(`[Cron] Found ${hostels.length} active hostels`);

      const results = [];

      // Generate dues for each hostel
      for (const hostel of hostels) {
        const result = await generateDuesForHostel(hostel.hostel_id, month_year);
        results.push({
          hostel_id: hostel.hostel_id,
          hostel_name: hostel.hostel_name,
          ...result
        });
      }

      // Summary
      const successful = results.filter(r => r.success).length;
      const skipped = results.filter(r => r.skipped).length;
      const failed = results.filter(r => r.error).length;

      console.log('===========================================');
      console.log('[Cron] Monthly Dues Generation Completed');
      console.log(`[Cron] Success: ${successful} | Skipped: ${skipped} | Failed: ${failed}`);
      console.log('===========================================');

      // TODO: Send notification to admin (email/SMS) with summary
      // TODO: Log to a cron_job_logs table for audit trail

    } catch (error) {
      console.error('[Cron] Fatal error in monthly dues generation:', error);
    }
  });

  console.log('✓ Monthly dues generation cron job scheduled (1st of each month at 12:01 AM IST)');

  return job;
};

// Optional: Manual trigger function for testing
export const triggerManualDuesGeneration = async () => {
  console.log('[Manual Trigger] Starting dues generation...');

  const now = new Date();
  const month_year = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const hostels = await db('hostel_master')
    .where('is_active', 1)
    .select('hostel_id', 'hostel_name');

  const results = [];

  for (const hostel of hostels) {
    const result = await generateDuesForHostel(hostel.hostel_id, month_year);
    results.push({
      hostel_id: hostel.hostel_id,
      hostel_name: hostel.hostel_name,
      ...result
    });
  }

  return results;
};
