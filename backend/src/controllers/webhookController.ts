import { Request, Response } from 'express';
import db from '../config/database.js';

/**
 * Strip HTML tags from a string for input sanitization
 */
const stripHtml = (str: any): string => {
  if (!str || typeof str !== 'string') return '';
  return str.replace(/<[^>]*>/g, '').trim();
};

/**
 * Convert date string to YYYY-MM-DD format
 */
const convertToDateOnly = (dateValue: any): string | null => {
  if (!dateValue) return null;
  if (typeof dateValue === 'string' && dateValue.includes('T')) {
    return dateValue.split('T')[0];
  }
  return dateValue;
};

/**
 * Handle Google Form submission webhook
 * Public endpoint - authenticated via X-API-Key header
 */
export const handleGoogleFormSubmission = async (req: Request, res: Response) => {
  try {
    // 1. Validate API key
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
      return res.status(401).json({
        success: false,
        error: 'Missing X-API-Key header'
      });
    }

    const keyRecord = await db('webhook_api_keys')
      .where({ api_key: apiKey, is_active: 1 })
      .first();

    if (!keyRecord) {
      return res.status(401).json({
        success: false,
        error: 'Invalid or inactive API key'
      });
    }

    const hostel_id = keyRecord.hostel_id;

    // Update last_used_at
    await db('webhook_api_keys')
      .where({ id: keyRecord.id })
      .update({ last_used_at: new Date() });

    // 2. Extract and sanitize form fields
    const body = req.body;

    const first_name = stripHtml(body.first_name);
    const last_name = stripHtml(body.last_name || '');
    const gender = stripHtml(body.gender);
    const phone = stripHtml(body.phone);
    const email = stripHtml(body.email || '');
    const date_of_birth = convertToDateOnly(body.date_of_birth);
    const guardian_name = stripHtml(body.guardian_name || '');
    const guardian_phone = stripHtml(body.guardian_phone);
    const guardian_relation_text = stripHtml(body.guardian_relation || '');
    const permanent_address = stripHtml(body.permanent_address || '');
    const present_working_address = stripHtml(body.present_working_address || '');
    const id_proof_type_text = stripHtml(body.id_proof_type || '');
    const id_proof_number = stripHtml(body.id_proof_number || '');
    const room_number_text = stripHtml(body.room_number || '');

    // 3. Validate required fields
    if (!first_name || !phone || !guardian_phone || !gender) {
      return res.status(400).json({
        success: false,
        error: 'Required fields: first_name, gender, phone, guardian_phone'
      });
    }

    // Validate gender value
    if (!['Male', 'Female', 'Other'].includes(gender)) {
      return res.status(400).json({
        success: false,
        error: 'Gender must be one of: Male, Female, Other'
      });
    }

    // 4. Check phone uniqueness among active students
    const existingStudent = await db('students')
      .where({ phone, status: 1 })
      .first();

    if (existingStudent) {
      return res.status(409).json({
        success: false,
        error: 'Student with this phone number already exists'
      });
    }

    // 5. Resolve guardian_relation text to FK
    let guardian_relation: number | null = null;
    if (guardian_relation_text) {
      const relation = await db('relations_master')
        .where('relation_name', guardian_relation_text)
        .where({ is_active: 1 })
        .first();
      if (relation) {
        guardian_relation = relation.relation_id;
      }
    }

    // 6. Resolve id_proof_type text to FK
    let id_proof_type: number | null = null;
    if (id_proof_type_text) {
      const proofType = await db('id_proof_types')
        .where(function() {
          this.where('name', id_proof_type_text).orWhere('code', id_proof_type_text.toUpperCase());
        })
        .where({ is_active: 1 })
        .first();
      if (proofType) {
        id_proof_type = proofType.id;
      }
    }

    // 7. Resolve room_number to room_id
    let room_id: number | null = null;
    let roomDetails: any = null;
    if (room_number_text) {
      const room = await db('rooms')
        .where({ room_number: room_number_text, hostel_id })
        .first();
      if (room) {
        room_id = room.room_id;
        roomDetails = room;
      }
      // If room not found, silently skip (don't fail)
    }

    // 8. Insert student record
    const now = new Date();
    const admissionDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;

    const [student_id] = await db('students').insert({
      hostel_id,
      first_name,
      last_name: last_name || null,
      date_of_birth: date_of_birth || null,
      gender,
      phone,
      email: email || null,
      guardian_name: guardian_name || null,
      guardian_phone,
      guardian_relation,
      permanent_address: permanent_address || null,
      present_working_address: present_working_address || null,
      id_proof_type,
      id_proof_number: id_proof_number || null,
      id_proof_status: 0,       // Not Submitted
      admission_date: admissionDate,
      admission_fee: 0,
      admission_status: 0,      // Unpaid
      status: 1,                // Active
      created_at: now
    });

    // 9. Room assignment (if room found)
    if (room_id && roomDetails) {
      const monthlyRent = roomDetails.rent_per_bed;

      await db('students')
        .where({ student_id })
        .update({
          room_id,
          monthly_rent: monthlyRent,
          updated_at: now
        });

      // Increment occupied beds
      await db('rooms')
        .where({ room_id })
        .increment('occupied_beds', 1);

      // 10. Auto-create monthly fee for current month
      if (monthlyRent) {
        try {
          const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

          const existingFee = await db('monthly_fees')
            .where({ student_id, fee_month: currentMonth })
            .first();

          if (!existingFee) {
            await db('monthly_fees').insert({
              student_id,
              hostel_id,
              fee_month: currentMonth,
              monthly_rent: monthlyRent,
              carry_forward: 0.00,
              total_due: monthlyRent,
              paid_amount: 0.00,
              balance: monthlyRent,
              fee_status: 'Pending',
              due_date: null,
              notes: 'Auto-created via Google Form webhook',
              created_at: now,
              updated_at: now
            });
          }
        } catch (feeError) {
          console.error('[Webhook] Error auto-creating monthly fee:', feeError);
        }
      }
    }

    console.log(`[Webhook] Student created via Google Form: ${student_id} (${first_name} ${last_name})`);

    res.status(201).json({
      success: true,
      message: 'Student registered successfully via Google Form',
      data: { student_id }
    });
  } catch (error: any) {
    console.error('Webhook Google Form error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to process Google Form submission'
    });
  }
};
