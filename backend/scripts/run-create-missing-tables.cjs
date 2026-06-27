const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Runs backend/migrations/create_missing_tables.sql
// All statements use CREATE TABLE IF NOT EXISTS, so this is safe to re-run.
//
// NOTE: .env has DB_HOST=db (a Docker service name). If you run this from the
// host machine, override it, e.g. (PowerShell):
//   $env:DB_HOST="localhost"; node scripts/run-create-missing-tables.cjs
// or run this script INSIDE the backend container where "db" resolves.

async function run() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME || 'Hostel',
    multipleStatements: true,
  });

  try {
    console.log(`=== CREATE MISSING TABLES (db: ${process.env.DB_NAME || 'Hostel'}) ===\n`);

    const sqlFile = path.join(__dirname, '../migrations/create_missing_tables.sql');
    const sql = fs.readFileSync(sqlFile, 'utf8');

    // Strip comments, then split into individual statements.
    const statements = sql
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    console.log(`Found ${statements.length} statements to execute\n`);

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];
      try {
        await connection.query(stmt);
        console.log(`✓ [${i + 1}/${statements.length}] ok`);
      } catch (err) {
        // Tolerate idempotent re-runs (table/index/column already exists).
        if (['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME', 'ER_DUP_ENTRY'].includes(err.code)) {
          console.log(`⚠️  [${i + 1}/${statements.length}] skipped (already exists): ${err.code}`);
        } else {
          console.error(`❌ [${i + 1}/${statements.length}] failed: ${err.message}`);
          console.error(`   Statement: ${stmt.slice(0, 120)}...`);
          throw err;
        }
      }
    }

    // Verify all 6 tables now exist.
    const [rows] = await connection.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = DATABASE()
         AND TABLE_NAME IN ('room_amenities_master','webhook_api_keys',
             'fee_structure','student_dues','student_fee_payments','room_allocations')`
    );
    const found = rows.map(r => r.TABLE_NAME || r.table_name);
    console.log(`\nTables present (${found.length}/6): ${found.join(', ')}`);

    console.log('\n✅ Done.');
  } catch (error) {
    console.error('\n❌ Migration failed:', error.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

run();
