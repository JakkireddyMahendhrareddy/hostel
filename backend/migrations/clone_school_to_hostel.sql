-- ============================================================
-- CLONE  school  ->  hostel   (structure + data)
-- ============================================================
-- Purpose: Populate the empty `hostel` schema with every table and
--          all rows from your existing `school` schema, so the app
--          (.env DB_NAME=Hostel) has its data.
--
-- HOW IT WORKS: loops over every base table in `school`, runs
--   CREATE TABLE IF NOT EXISTS hostel.<t> LIKE school.<t>;
--   INSERT INTO hostel.<t> SELECT * FROM school.<t>;
-- Foreign-key checks are disabled during the copy so table order
-- does not matter.
--
-- ⚠️ RUN ONCE. Re-running would INSERT the rows a second time and
--    fail on duplicate primary keys. If you need to redo it, drop the
--    hostel tables first (or empty the schema) before re-running.
--
-- After this, run:  create_missing_tables.sql  (with hostel selected)
-- ============================================================

SET FOREIGN_KEY_CHECKS = 0;

DROP PROCEDURE IF EXISTS school.clone_to_hostel;

DELIMITER $$
CREATE PROCEDURE school.clone_to_hostel()
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

        -- copy structure
        SET @s = CONCAT('CREATE TABLE IF NOT EXISTS hostel.`', tname, '` LIKE school.`', tname, '`');
        PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;

        -- copy data
        SET @s = CONCAT('INSERT INTO hostel.`', tname, '` SELECT * FROM school.`', tname, '`');
        PREPARE st FROM @s; EXECUTE st; DEALLOCATE PREPARE st;
    END LOOP;
    CLOSE cur;
END$$
DELIMITER ;

CALL school.clone_to_hostel();
DROP PROCEDURE school.clone_to_hostel;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================
-- VERIFY
-- ============================================================
-- Compare table counts between the two schemas (should match):
SELECT
    (SELECT COUNT(*) FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = 'school' AND TABLE_TYPE = 'BASE TABLE') AS school_tables,
    (SELECT COUNT(*) FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = 'hostel' AND TABLE_TYPE = 'BASE TABLE') AS hostel_tables;
