-- ============================================================
-- CREATE MISSING TABLES
-- ============================================================
-- Purpose: Recreate the 6 tables that the backend code references
--          but are missing from the database.
--
-- Safe to run: every statement uses CREATE TABLE IF NOT EXISTS,
--              so your existing 21 tables are NOT touched.
--
-- Run order matters because of foreign keys. Keep this order.
-- All referenced parent tables (hostel_master, students, rooms,
-- payment_modes, users) must already exist.
--
-- Generated: 2026-06-26
-- ============================================================


-- ============================================================
-- 1. room_amenities_master   (CONFIRMED — from migration file)
--    Used by: amenitiesController.getRoomAmenities
-- ============================================================
CREATE TABLE IF NOT EXISTS room_amenities_master (
    amenity_id INT AUTO_INCREMENT PRIMARY KEY,
    amenity_name VARCHAR(100) NOT NULL UNIQUE,
    amenity_icon VARCHAR(50) NULL,
    description TEXT NULL,
    is_active TINYINT(1) DEFAULT 1,
    display_order INT DEFAULT 0,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT IGNORE INTO room_amenities_master (amenity_name, amenity_icon, description, display_order) VALUES
('AC', 'snowflake', 'Air conditioning in room', 1),
('Attached Bathroom', 'bath', 'Private bathroom attached to room', 2),
('WiFi', 'wifi', 'High-speed wireless internet connectivity', 3),
('Balcony', 'home', 'Private or shared balcony', 4),
('Window', 'window', 'Window with natural light and ventilation', 5),
('Cupboard', 'box', 'Storage cupboard or wardrobe', 6),
('Study Table', 'table', 'Study desk and chair', 7),
('Chair', 'chair', 'Comfortable chair for study', 8);


-- ============================================================
-- 2. webhook_api_keys   (CONFIRMED — from migration file)
--    Used by: webhookController, webhookKeyController
-- ============================================================
CREATE TABLE IF NOT EXISTS webhook_api_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    api_key VARCHAR(64) NOT NULL UNIQUE,
    is_active TINYINT(1) DEFAULT 1,
    last_used_at TIMESTAMP NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_webhook_api_keys_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_webhook_api_keys_active ON webhook_api_keys(api_key, is_active);


-- ============================================================
-- 3. fee_structure   (RECONSTRUCTED from code — old fee system)
--    Used by: feeController (generateMonthlyDues, getAllStudentsWithDues)
--    Columns inferred from INSERT/SELECT usage in scripts + controller.
-- ============================================================
CREATE TABLE IF NOT EXISTS fee_structure (
    fee_structure_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    fee_type VARCHAR(100) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'Monthly',  -- 'Monthly' | 'One-Time'
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fee_structure_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


-- ============================================================
-- 4. student_dues   (RECONSTRUCTED from code — old fee system)
--    Used by: feeController (dues listing, payment allocation, generation)
--    Column set merged from: setup-fees-and-generate-dues.cjs INSERT,
--    add_fee_categories_support.sql ALTERs, and feeController SELECT/UPDATE.
-- ============================================================
CREATE TABLE IF NOT EXISTS student_dues (
    due_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    hostel_id INT NOT NULL,
    fee_category_id INT NULL,
    due_month VARCHAR(20) NOT NULL,            -- format: YYYY-MM
    due_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    paid_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    balance_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_carried_forward TINYINT(1) DEFAULT 0,
    carried_from_month VARCHAR(20) NULL,
    due_date DATE NULL,
    is_paid TINYINT(1) DEFAULT 0,
    paid_date DATE NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_student_dues_student
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_student_dues_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
    CONSTRAINT fk_student_dues_fee_category
        FOREIGN KEY (fee_category_id) REFERENCES fee_structure(fee_structure_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_student_dues_category ON student_dues(fee_category_id);
CREATE INDEX idx_student_dues_month ON student_dues(due_month);
CREATE INDEX idx_student_dues_student_month ON student_dues(student_id, due_month);


-- ============================================================
-- 5. student_fee_payments   (RECONSTRUCTED from code — old fee system)
--    Used by: feeController (recordPayment, payment history, receipt)
--    Columns inferred from INSERT in recordPayment + SELECT lists.
-- ============================================================
CREATE TABLE IF NOT EXISTS student_fee_payments (
    payment_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    hostel_id INT NOT NULL,
    payment_date DATE NOT NULL,
    amount_paid DECIMAL(10,2) NOT NULL,
    payment_mode_id INT NULL,
    payment_for_month VARCHAR(20) NULL,
    transaction_reference VARCHAR(100) NULL,
    receipt_number VARCHAR(100) NULL,
    remarks TEXT NULL,
    created_by INT NULL,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_sfp_student
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_sfp_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
    CONSTRAINT fk_sfp_payment_mode
        FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(payment_mode_id) ON DELETE SET NULL,
    CONSTRAINT fk_sfp_created_by
        FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_sfp_student ON student_fee_payments(student_id);
CREATE INDEX idx_sfp_hostel ON student_fee_payments(hostel_id);
CREATE INDEX idx_sfp_payment_date ON student_fee_payments(payment_date);


-- ============================================================
-- 6. room_allocations   (RECONSTRUCTED — DEPRECATED / DROPPED TABLE)
--    WARNING: This table was deliberately removed (see
--    ROOM_ALLOCATIONS_MIGRATION_GUIDE.md and
--    scripts/drop-room-allocations-table.cjs). Room data now lives on
--    students.room_id / students.monthly_rent.
--    Old scripts disagree on column names (is_active vs is_current,
--    check_out_date vs checkout_date) so BOTH variants are included to
--    keep all legacy code paths working. Only create this if /api/fees
--    is actually used. Otherwise, prefer removing the /api/fees route.
-- ============================================================
CREATE TABLE IF NOT EXISTS room_allocations (
    allocation_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    room_id INT NOT NULL,
    hostel_id INT NOT NULL,
    monthly_rent DECIMAL(10,2) NULL,
    allocation_date DATE NULL,
    check_out_date DATE NULL,
    checkout_date DATE NULL,
    is_active TINYINT(1) DEFAULT 1,
    is_current TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_room_allocations_student
        FOREIGN KEY (student_id) REFERENCES students(student_id) ON DELETE CASCADE,
    CONSTRAINT fk_room_allocations_room
        FOREIGN KEY (room_id) REFERENCES rooms(room_id) ON DELETE CASCADE,
    CONSTRAINT fk_room_allocations_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE INDEX idx_room_allocations_student ON room_allocations(student_id);
CREATE INDEX idx_room_allocations_room ON room_allocations(room_id);


-- ============================================================
-- VERIFICATION
-- ============================================================
-- SHOW TABLES LIKE '%room_amenities_master%';
-- SHOW TABLES;
-- SELECT TABLE_NAME FROM information_schema.TABLES
--   WHERE TABLE_SCHEMA = DATABASE()
--     AND TABLE_NAME IN ('room_amenities_master','webhook_api_keys',
--         'fee_structure','student_dues','student_fee_payments','room_allocations');
