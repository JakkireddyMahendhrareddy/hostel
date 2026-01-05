import { Response } from 'express';
import db from '../config/database.js';
import { AuthRequest } from '../middleware/auth.js';

// Helper function to convert ISO datetime string to date-only format (YYYY-MM-DD)
const convertToDateOnly = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    // Extract date part from ISO string (YYYY-MM-DDTHH:mm:ss.sssZ -> YYYY-MM-DD)
    return dateValue.split('T')[0];
  }
  return dateValue;
};

// Get all students (Owner sees only their hostel students)
export const getStudents = async (req: AuthRequest, res: Response) => {
  try {
    const { hostelId } = req.query;
    const user = req.user;

    let query = db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.*', // This includes room_id, monthly_rent, inactive_date
        'h.hostel_name',
        'r.room_number',
        'r.floor_number',
        's.admission_date as check_in_date'
      );

    // If user is hostel owner (role_id = 2), filter by their hostel_id from JWT token
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel. Please contact administrator.'
        });
      }
      query = query.where('s.hostel_id', user.hostel_id);
    }

    // Filter by specific hostel if provided
    if (hostelId) {
      query = query.where('s.hostel_id', hostelId);
    }

    const students = await query.orderBy('s.created_at', 'desc');

    res.json({
      success: true,
      data: students
    });
  } catch (error: any) {
    console.error('Get students error:', error);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to fetch students',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Get student by ID
export const getStudentById = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    const student = await db('students as s')
      .leftJoin('hostel_master as h', 's.hostel_id', 'h.hostel_id')
      .leftJoin('rooms as r', 's.room_id', 'r.room_id')
      .select(
        's.*',
        'h.hostel_name',
        'r.room_number',
        'r.floor_number',
        's.admission_date as check_in_date'
      )
      .where('s.student_id', studentId)
      .first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Get payment history
    const payments = await db('student_fee_payments')
      .where({ student_id: studentId })
      .orderBy('payment_date', 'desc')
      .limit(10);

    // Get pending dues
    const dues = await db('student_dues')
      .where({ student_id: studentId, is_paid: 0 })
      .select('*');

    res.json({
      success: true,
      data: {
        ...student,
        payment_history: payments,
        pending_dues: dues
      }
    });
  } catch (error) {
    console.error('Get student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch student'
    });
  }
};

// Create new student
export const createStudent = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    const {
      first_name,
      last_name,
      date_of_birth,
      gender,
      phone,
      email,
      guardian_name,
      guardian_phone,
      guardian_relation,
      permanent_address,
      present_working_address,
      id_proof_type,
      id_proof_number,
      id_proof_status,
      admission_date,
      admission_fee,
      admission_status,
      due_date,
      status,
      room_id,
      floor_number
    } = req.body;

    // Determine hostel_id from JWT token for owners
    let hostel_id: number;
    if (user?.role_id === 2) {
      if (!user.hostel_id) {
        return res.status(403).json({
          success: false,
          error: 'Your account is not linked to any hostel. Please contact administrator.'
        });
      }
      hostel_id = user.hostel_id;
    } else if (user?.role_id === 1) {
      // Admin can specify hostel_id
      hostel_id = req.body.hostel_id;
      if (!hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'Admin must specify hostel_id'
        });
      }
    } else {
      return res.status(403).json({
        success: false,
        error: 'Unauthorized to create students'
      });
    }

    // Validate required fields
    if (!first_name || !phone || !guardian_phone || !admission_date || !gender || admission_fee === undefined || !admission_status) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: first_name, gender, phone, guardian_phone, admission_date, admission_fee, admission_status'
      });
    }

    // Check if phone already exists
    const existingStudent = await db('students')
      .where({ phone, status: 'Active' })
      .first();

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        error: 'Student with this phone number already exists'
      });
    }

    // If room allocation is provided, check room availability
    let roomDetails = null;
    if (room_id) {
      const room = await db('rooms').where({ room_id }).first();

      if (!room) {
        return res.status(404).json({
          success: false,
          error: 'Room not found'
        });
      }

      // Check if room belongs to the same hostel
      if (room.hostel_id !== hostel_id) {
        return res.status(400).json({
          success: false,
          error: 'Room does not belong to the selected hostel'
        });
      }

      // Check if room has capacity (using total_capacity from room_type if available)
      // For now, we'll skip capacity check since capacity column was removed
      // Room availability is now determined by available_beds calculation

      roomDetails = room;
    }

    // Insert student
    const [student_id] = await db('students').insert({
      hostel_id,
      first_name,
      last_name,
      date_of_birth: convertToDateOnly(date_of_birth),
      gender,
      phone,
      email,
      guardian_name,
      guardian_phone,
      guardian_relation,
      permanent_address,
      present_working_address,
      id_proof_type,
      id_proof_number,
      id_proof_status: id_proof_status || 'Not Submitted',
      admission_date: convertToDateOnly(admission_date),
      admission_fee: admission_fee || 0,
      admission_status: admission_status || 'Unpaid',
      due_date: convertToDateOnly(due_date),
      status: status || 'Active',
      floor_number: floor_number || null,
      created_at: new Date()
    });

    // If room allocation provided, update student record directly
    if (room_id && roomDetails) {
      const studentStatus = status || 'Active'; // Default to Active if not specified
      const monthlyRent = roomDetails.rent_per_bed;
      
      // Update student with room information
      await db('students')
        .where({ student_id })
        .update({
          room_id: room_id,
          monthly_rent: monthlyRent,
          updated_at: new Date()
        });

      // Update room occupied beds ONLY if student is Active
      if (studentStatus === 'Active') {
        await db('rooms')
          .where({ room_id })
          .increment('occupied_beds', 1);
      }

      // Auto-create monthly fee for current month if student is Active and has room
      if (studentStatus === 'Active' && monthlyRent) {
        try {
          const now = new Date();
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
          const feeDate = now.getMonth() + 1; // Month as number (1-12)

          // Check if fee already exists for this month
          const existingFee = await db('monthly_fees')
            .where({
              student_id,
              fee_month: currentMonth,
              fee_date: feeDate
            })
            .first();

          if (!existingFee) {
            // Calculate due date (default to 15th of current month)
            const dueDate = new Date(now.getFullYear(), now.getMonth(), 15);

            // Create monthly fee record
            await db('monthly_fees').insert({
              student_id,
              hostel_id,
              fee_month: currentMonth,
              fee_date: feeDate,
              monthly_rent: monthlyRent,
              carry_forward: 0.00,
              total_due: monthlyRent,
              paid_amount: 0.00,
              balance: monthlyRent,
              fee_status: 'Pending',
              due_date: dueDate,
              notes: 'Auto-created on student registration',
              created_at: new Date(),
              updated_at: new Date()
            });

            console.log(`[createStudent] Auto-created monthly fee for student ${student_id}, month: ${currentMonth}`);
          }
        } catch (feeError) {
          // Log error but don't fail student creation
          console.error('[createStudent] Error auto-creating monthly fee:', feeError);
        }
      }
    }

    res.status(201).json({
      success: true,
      message: 'Student registered successfully',
      data: { student_id }
    });
  } catch (error) {
    console.error('Create student error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to register student'
    });
  }
};

// Update student
export const updateStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { room_id, monthly_rent } = req.body;
    const updateData: any = { updated_at: new Date() };

    // Get student data early (needed for status and room tracking)
    const student = await db('students').where({ student_id: studentId }).first();
    
    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Store original values for room bed count management
    const oldStatus = student.status;
    const oldRoomId = student.room_id;
    const newStatus = req.body.status !== undefined ? req.body.status : oldStatus;

    // Allow updating specific fields
    const allowedFields = [
      'first_name', 'last_name', 'date_of_birth', 'gender', 'phone', 'email',
      'guardian_name', 'guardian_phone', 'guardian_relation',
      'permanent_address', 'present_working_address',
      'id_proof_type', 'id_proof_number', 'id_proof_status',
      'admission_date', 'admission_fee', 'admission_status', 'due_date', 'status', 'floor_number'
    ];

    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) {
        // Handle date fields - convert ISO datetime strings to date-only format
        if (field === 'due_date' || field === 'admission_date' || field === 'date_of_birth') {
          updateData[field] = convertToDateOnly(req.body[field]);
        } else {
          updateData[field] = req.body[field];
        }
      }
    });

    // Handle status changes and inactive_date
    if (req.body.status !== undefined) {
      if (req.body.status === 'Inactive') {
        // Set inactive_date to current date when marking student as inactive
        // Only set if student was previously active (to avoid overwriting existing date)
        if (oldStatus === 'Active') {
          updateData.inactive_date = new Date();
        }

        // When changing to Inactive, ALWAYS clear room assignment
        // Inactive students should not have room assignments
        if (oldRoomId) {
          updateData.room_id = null;
          updateData.monthly_rent = null;
        }
      } else if (req.body.status === 'Active') {
        // Clear inactive_date when reactivating student
        updateData.inactive_date = null;

        // If student was previously inactive, update admission_date to current date (re-admission)
        if (oldStatus === 'Inactive') {
          updateData.admission_date = new Date();
        }
      }
    }

    // Handle monthly_rent update if provided
    if (monthly_rent !== undefined && monthly_rent !== null) {
      updateData.monthly_rent = monthly_rent;
    }

    // Handle room allocation changes if room_id is provided
    // BUT: Don't allow room assignment if student is being set to Inactive
    if (room_id !== undefined && newStatus !== 'Inactive') {
      if (!room_id) {
        // room_id is null or empty - remove room assignment
        updateData.room_id = null;
        updateData.monthly_rent = null;
      } else {
        // Validate and set new room
        const newRoom = await db('rooms').where({ room_id }).first();

        if (!newRoom) {
          return res.status(404).json({
            success: false,
            error: 'Room not found'
          });
        }

        // Check if room belongs to same hostel
        if (newRoom.hostel_id !== student.hostel_id) {
          return res.status(400).json({
            success: false,
            error: 'Room does not belong to student hostel'
          });
        }

        // Update student with new room information
        updateData.room_id = room_id;
        // Use provided monthly_rent or room's rent_per_bed
        if (monthly_rent === undefined || monthly_rent === null) {
          updateData.monthly_rent = newRoom.rent_per_bed;
        }

        // Update admission_date to current date when room is assigned/changed (if new room)
        if (!oldRoomId || oldRoomId !== room_id) {
          updateData.admission_date = new Date();
        }
      }
    }

    // Now perform the single database update with all changes
    await db('students')
      .where({ student_id: studentId })
      .update(updateData);

    // Handle room occupied_beds count changes AFTER student update
    // This ensures we have the correct status and room_id values

    // Get updated student to get final values
    const updatedStudent = await db('students').where({ student_id: studentId }).first();
    if (!updatedStudent) {
      return res.status(404).json({
        success: false,
        error: 'Student not found after update'
      });
    }

    const finalStatus = updatedStudent.status;
    const finalRoomId = updatedStudent.room_id;

    // Handle bed count changes based on status and room changes
    if (oldStatus === 'Active' && finalStatus === 'Inactive') {
      // Student became inactive - free up the bed
      if (oldRoomId) {
        try {
          await db('rooms')
            .where({ room_id: oldRoomId })
            .decrement('occupied_beds', 1);
          console.log(`Decremented occupied_beds for room ${oldRoomId} when student ${studentId} became inactive`);
        } catch (bedError: any) {
          console.error('Error decrementing room occupied_beds:', bedError);
        }
      }
    } else if (oldStatus === 'Inactive' && finalStatus === 'Active') {
      // Student became active - add bed if room is assigned
      if (finalRoomId) {
        try {
          await db('rooms')
            .where({ room_id: finalRoomId })
            .increment('occupied_beds', 1);
          console.log(`Incremented occupied_beds for room ${finalRoomId} when student ${studentId} became active`);
        } catch (bedError: any) {
          console.error('Error incrementing room occupied_beds:', bedError);
        }
      }
    } else if (finalStatus === 'Active') {
      // Student is active - handle room changes
      if (oldRoomId && finalRoomId && oldRoomId !== finalRoomId) {
        // Student changed rooms
        try {
          await db('rooms')
            .where({ room_id: oldRoomId })
            .decrement('occupied_beds', 1);
          await db('rooms')
            .where({ room_id: finalRoomId })
            .increment('occupied_beds', 1);
          console.log(`Student ${studentId} moved from room ${oldRoomId} to ${finalRoomId}`);
        } catch (bedError: any) {
          console.error('Error updating room occupied_beds:', bedError);
        }

        // Update unpaid dues with new monthly rent
        const newRent = updatedStudent.monthly_rent || 0;
        const oldRent = student.monthly_rent || 0;
        const rentDifference = newRent - oldRent;

        if (rentDifference !== 0) {
          try {
            await db('student_dues')
              .where({ student_id: studentId, is_paid: 0 })
              .update({
                monthly_rent: newRent,
                total_amount: db.raw('total_amount + ?', [rentDifference]),
                balance_amount: db.raw('balance_amount + ?', [rentDifference]),
                updated_at: new Date()
              });
          } catch (duesError: any) {
            console.error('Error updating student dues:', duesError);
          }
        }
      } else if (!oldRoomId && finalRoomId) {
        // Student was assigned a new room
        try {
          await db('rooms')
            .where({ room_id: finalRoomId })
            .increment('occupied_beds', 1);
          console.log(`Assigned room ${finalRoomId} to student ${studentId}`);
        } catch (bedError: any) {
          console.error('Error incrementing room occupied_beds:', bedError);
        }
      } else if (oldRoomId && !finalRoomId) {
        // Student's room was removed
        try {
          await db('rooms')
            .where({ room_id: oldRoomId })
            .decrement('occupied_beds', 1);
          console.log(`Removed room ${oldRoomId} from student ${studentId}`);
        } catch (bedError: any) {
          console.error('Error decrementing room occupied_beds:', bedError);
        }
      }
    }

    res.json({
      success: true,
      message: 'Student updated successfully'
    });
  } catch (error: any) {
    console.error('Update student error:', error);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to update student',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Delete student (hard delete - only for inactive students)
export const deleteStudent = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;

    // Get student to verify they exist and are inactive
    const student = await db('students').where({ student_id: studentId }).first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    // Only allow deletion of inactive students
    if (student.status !== 'Inactive') {
      return res.status(400).json({
        success: false,
        error: 'Only inactive students can be deleted. Please mark the student as inactive first.'
      });
    }

    // Delete all related data first (to avoid foreign key constraints)
    // Delete student fee payments
    await db('student_fee_payments')
      .where({ student_id: studentId })
      .del();

    // Delete student dues
    await db('student_dues')
      .where({ student_id: studentId })
      .del();

    // Finally, delete the student record permanently
    await db('students')
      .where({ student_id: studentId })
      .del();

    console.log(`Permanently deleted student ${studentId} (${student.first_name} ${student.last_name}) and all related data`);

    res.json({
      success: true,
      message: 'Student and all related data deleted permanently'
    });
  } catch (error: any) {
    console.error('Delete student error:', error);
    console.error('Error details:', {
      message: error?.message,
      sql: error?.sql,
      code: error?.code,
      errno: error?.errno,
      stack: error?.stack
    });
    res.status(500).json({
      success: false,
      error: 'Failed to delete student',
      details: process.env.NODE_ENV === 'development' ? error?.message : undefined
    });
  }
};

// Allocate/Change room for student
export const allocateRoom = async (req: AuthRequest, res: Response) => {
  try {
    const { studentId } = req.params;
    const { room_id } = req.body;

    if (!room_id) {
      return res.status(400).json({
        success: false,
        error: 'Room ID is required'
      });
    }

    const student = await db('students').where({ student_id: studentId }).first();

    if (!student) {
      return res.status(404).json({
        success: false,
        error: 'Student not found'
      });
    }

    const room = await db('rooms').where({ room_id }).first();

    if (!room) {
      return res.status(404).json({
        success: false,
        error: 'Room not found'
      });
    }

    // Check if student is active (only active students count in room occupancy)
    const isStudentActive = student.status === 'Active';
    const oldRoomId = student.room_id;

    // If student had a previous room, decrement its occupied beds
    if (oldRoomId) {
      // Decrease old room occupied beds ONLY if student is active
      if (isStudentActive) {
        await db('rooms')
          .where({ room_id: oldRoomId })
          .decrement('occupied_beds', 1);
      }
    }

    // Update student with new room
    await db('students')
      .where({ student_id: studentId })
      .update({
        room_id: room_id,
        monthly_rent: room.rent_per_bed,
        admission_date: new Date(), // Update admission_date when room is allocated
        updated_at: new Date()
      });

    // Increase new room occupied beds ONLY if student is active
    if (isStudentActive) {
      await db('rooms')
        .where({ room_id })
        .increment('occupied_beds', 1);
    }

    res.json({
      success: true,
      message: 'Room allocated successfully'
    });
  } catch (error) {
    console.error('Allocate room error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to allocate room'
    });
  }
};
