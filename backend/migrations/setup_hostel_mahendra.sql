-- ============================================================
-- ONE-SHOT SETUP:  create `Hostel_Mahendra`  with all tables
-- ============================================================
-- Does three things, in order:
--   1. Creates the database `Hostel_Mahendra`.
--   2. Clones EVERY table + all data from the existing `school` schema.
--   3. Adds the 6 tables that are missing from `school`.
--
-- Just run this whole file once in MySQL Workbench.
--
-- ⚠️ RUN ONCE. The clone step INSERTs rows; re-running would duplicate
--    them and fail on primary keys. To redo, DROP DATABASE Hostel_Mahendra
--    first, then run again.
-- ============================================================


-- ------------------------------------------------------------
-- STEP 1: create the database
-- ------------------------------------------------------------
CREATE DATABASE IF NOT EXISTS `Hostel_Mahendra`
    CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci;


-- ------------------------------------------------------------
-- STEP 2: clone school  ->  Hostel_Mahendra  (structure + data)
-- ------------------------------------------------------------
SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS school.clone_schema;

DELIMITER $$
CREATE PROCEDURE school.clone_schema(IN target_db VARCHAR(64))
BEGIN
    DECLARE done INT DEFAULT 0;
    DECLARE tname VARCHAR(255);
    DECLARE cur CURSOR FOR
        SELECT TABLE_NAME
        FROM information_schema.TABLES
        WHERE TABLE_SCHEMA = 'school'
          AND TABLE_TYPE = 'BASE TABLE';
    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = 1;

    OPEN cur;
    read_loop: LOOP
        FETCH cur INTO tname;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET @s = CONCAT('CREATE TABLE IF NOT EXISTS `', target_db, '`.`', tname, '` LIKE school.`', tname, '`');
        PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

        SET @s = CONCAT('INSERT INTO `', target_db, '`.`', tname, '` SELECT * FROM school.`', tname, '`');
        PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
    END LOOP;
    CLOSE cur;
END$$
DELIMITER ;

CALL school.clone_schema('Hostel_Mahendra');
DROP PROCEDURE school.clone_schema;

SET FOREIGN_KEY_CHECKS = 1;


-- ------------------------------------------------------------
-- STEP 3: add the 6 missing tables
-- ------------------------------------------------------------
USE `Hostel_Mahendra`;

-- 3.1 room_amenities_master  (CONFIRMED)
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

-- 3.2 webhook_api_keys  (CONFIRMED)
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

-- 3.3 fee_structure  (RECONSTRUCTED — old fee system)
CREATE TABLE IF NOT EXISTS fee_structure (
    fee_structure_id INT AUTO_INCREMENT PRIMARY KEY,
    hostel_id INT NOT NULL,
    fee_type VARCHAR(100) NOT NULL,
    frequency VARCHAR(20) NOT NULL DEFAULT 'Monthly',
    amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    is_active TINYINT(1) DEFAULT 1,
    created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    CONSTRAINT fk_fee_structure_hostel
        FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3.4 student_dues  (RECONSTRUCTED — old fee system)
CREATE TABLE IF NOT EXISTS student_dues (
    due_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id INT NOT NULL,
    hostel_id INT NOT NULL,
    fee_category_id INT NULL,
    due_month VARCHAR(20) NOT NULL,
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

-- 3.5 student_fee_payments  (RECONSTRUCTED — old fee system)
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

-- 3.6 room_allocations  (RECONSTRUCTED — DEPRECATED table, best-effort)
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


-- ------------------------------------------------------------
-- VERIFY
-- ------------------------------------------------------------
SELECT
    (SELECT COUNT(*) FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = 'school' AND TABLE_TYPE = 'BASE TABLE') AS school_tables,
    (SELECT COUNT(*) FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = 'Hostel_Mahendra' AND TABLE_TYPE = 'BASE TABLE') AS hostel_mahendra_tables;
-- hostel_mahendra_tables should be school_tables + (number of the 6 not already in school)
