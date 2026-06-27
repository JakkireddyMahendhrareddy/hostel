// Rebuilds Hostel_Mahendra FRESH from the repo on the local MySQL server.
//
// Strategy (because the repo migrations are contradictory / order-broken):
//   1. DROP + CREATE Hostel_Mahendra
//   2. Load database_schema.sql      -> base schema + sample data
//   3. Create the current feature tables that the code needs
//   4. Apply additive column migrations (tolerant; data-transform steps that
//      can't apply to sample data are logged and skipped)
//   SKIP: consolidate_fee_payments_drop_monthly_fees.sql (destructive, would
//         drop monthly_fees/fee_history which current code still uses)
//
// Connects to localhost directly (NOT the Docker `db` host in .env).

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '../../');          // d:/Hostel
const MIG = path.join(__dirname, '../migrations');     // backend/migrations
const TARGET = 'Hostel_Mahendra';

const DB = {
  host: 'localhost', port: 3306, user: 'root', password: 'Mahi@0712',
};

// Income table has no .sql file (it lived in a .cjs), so inline it.
const INCOME_SQL = `
CREATE TABLE IF NOT EXISTS income (
  income_id INT PRIMARY KEY AUTO_INCREMENT,
  hostel_id INT NOT NULL,
  income_date DATE NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  source VARCHAR(255) NOT NULL,
  payment_mode_id INT NOT NULL,
  receipt_number VARCHAR(100),
  description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (hostel_id) REFERENCES hostel_master(hostel_id) ON DELETE CASCADE,
  FOREIGN KEY (payment_mode_id) REFERENCES payment_modes(payment_mode_id),
  INDEX idx_hostel_id (hostel_id),
  INDEX idx_income_date (income_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;`;

// Ordered build steps. {phase, file} reads from disk; {phase, sql} runs inline.
const STEPS = [
  ['BASE',     path.join(ROOT, 'database_schema.sql')],

  // New master / lookup tables (needed before FK-conversion migrations)
  ['MASTERS',  path.join(ROOT, 'create_amenities_master_table.sql')],
  ['MASTERS',  path.join(MIG, 'create_room_amenities_master.sql')],
  ['MASTERS',  path.join(MIG, 'create_relations_master.sql')],
  ['MASTERS',  path.join(MIG, 'create_id_proof_types_master.sql')],
  ['MASTERS',  { sql: INCOME_SQL, label: 'income (inline)' }],
  ['MASTERS',  path.join(MIG, 'create_webhook_api_keys.sql')],

  // New monthly-fee system tables
  ['FEES',     path.join(MIG, 'create_monthly_fees_tables.sql')],
  ['FEES',     path.join(MIG, 'add_transaction_type_to_fee_payments.sql')],
  ['FEES',     path.join(MIG, 'add_missing_fee_payments_columns.sql')],
  ['FEES',     path.join(MIG, 'fix_fee_payments_columns.sql')],
  ['FEES',     path.join(MIG, 'cleanup_fee_payments_columns.sql')],
  ['FEES',     path.join(MIG, 'add_due_date_to_fee_payments.sql')],
  ['FEES',     path.join(MIG, 'add_fee_categories_support.sql')],

  // Users / hostel / rooms additive changes
  ['USERS',    path.join(MIG, 'add_hostel_id_to_users.sql')],
  ['USERS',    path.join(MIG, 'add_password_reset_columns.sql')],
  ['HOSTEL',   path.join(MIG, 'remove_total_rooms_column.sql')],
  ['HOSTEL',   path.join(MIG, 'remove_hostel_contact_email.sql')],
  ['ROOMS',    path.join(MIG, 'remove_capacity_column.sql')],

  // Students additive / transform changes
  ['STUDENTS', path.join(MIG, 'add_room_fields_to_students.sql')],
  ['STUDENTS', path.join(MIG, 'add_floor_number_to_students.sql')],
  ['STUDENTS', path.join(MIG, 'add_inactive_date_column.sql')],
  ['STUDENTS', path.join(MIG, 'add_status_column.sql')],
  ['STUDENTS', path.join(MIG, 'rename_is_active_to_status.sql')],
  ['STUDENTS', path.join(MIG, 'fix_admission_status_enum.sql')],
  ['STUDENTS', path.join(MIG, 'add_id_proof_status_column.sql')],
  ['STUDENTS', path.join(MIG, 'fix_present_working_address_column.sql')],
  ['STUDENTS', path.join(MIG, 'update_students_table.sql')],
  ['STUDENTS', path.join(MIG, 'add_monthly_fee_columns.sql')],
  ['STUDENTS', path.join(MIG, 'convert_enum_to_boolean.sql')],
  ['STUDENTS', path.join(MIG, 'add_id_proof_type_foreign_key.sql')],
  ['STUDENTS', path.join(MIG, 'convert_proof_type_and_relation_to_foreign_keys.sql')],

  // Room allocations / misc
  ['MISC',     path.join(MIG, 'add_hostel_id_to_room_allocations.sql')],
  ['MISC',     path.join(MIG, 'fix_owners_without_hostel_id.sql')],
];

function splitStatements(sql) {
  return sql
    .replace(/--.*$/gm, '')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split(';')
    .map(s => s.trim())
    .filter(s => s.length > 0 && !/^DESCRIBE/i.test(s) && !/^SHOW /i.test(s) && !/^SELECT /i.test(s));
}

async function main() {
  const conn = await mysql.createConnection(DB);
  console.log(`✓ Connected to ${DB.host}:${DB.port}\n`);
  const warnings = [];
  try {
    // STEP 1: fresh database
    await conn.query(`DROP DATABASE IF EXISTS \`${TARGET}\``);
    await conn.query(`CREATE DATABASE \`${TARGET}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    await conn.changeUser({ database: TARGET });
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(`STEP 1 ✓ fresh database \`${TARGET}\`\n`);

    // STEP 2..n: run steps
    for (const step of STEPS) {
      const phase = step[0];
      const spec = step[1];
      let sql, label;
      if (typeof spec === 'string') { sql = fs.readFileSync(spec, 'utf8'); label = path.basename(spec); }
      else { sql = spec.sql; label = spec.label; }

      const statements = splitStatements(sql);
      let ok = 0, failed = 0;
      for (const stmt of statements) {
        try { await conn.query(stmt); ok++; }
        catch (err) { failed++; warnings.push(`[${phase}] ${label}: ${err.code || err.message}`); }
      }
      const mark = failed === 0 ? '✓' : '⚠';
      console.log(`  ${mark} [${phase}] ${label}  (${ok} ok${failed ? `, ${failed} skipped` : ''})`);
    }

    // VERIFY
    console.log('\n' + '='.repeat(60));
    const [tables] = await conn.query(
      `SELECT TABLE_NAME t, TABLE_ROWS r FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE='BASE TABLE' ORDER BY TABLE_NAME`, [TARGET]);
    console.log(`Tables in ${TARGET}: ${tables.length}`);
    for (const { t } of tables) {
      const [[{ c }]] = await conn.query(`SELECT COUNT(*) c FROM \`${t}\``);
      console.log(`   ${t.padEnd(26)} ${c} rows`);
    }

    if (warnings.length) {
      console.log('\n' + '-'.repeat(60));
      console.log(`Skipped statements (${warnings.length}) — expected for data-transform steps on sample data:`);
      warnings.forEach(w => console.log('   • ' + w));
    }
    console.log('\n✅ Build complete.');
  } catch (error) {
    console.error('\n❌ Build failed:', error.message);
    process.exitCode = 1;
  } finally {
    await conn.end();
  }
}

main();
