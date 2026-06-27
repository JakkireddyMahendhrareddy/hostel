// Builds the Hostel_Mahendra database on the LOCAL MySQL server.
//   1. CREATE DATABASE Hostel_Mahendra
//   2. Clone every table + data from `school`
//   3. Add the 6 missing tables (from migrations/create_missing_tables.sql)
//
// Connects to localhost directly (NOT the Docker `db` host in .env), because
// that is where the `school` schema actually lives.
//
// Idempotent: tables use IF NOT EXISTS; data is only copied into empty target
// tables; duplicate-index/table errors are tolerated.

const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');

const DB = {
  host: process.env.DB_HOST_LOCAL || 'localhost',
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || 'Mahi@0712',
  multipleStatements: true,
};

const SOURCE_DB = 'school';
const TARGET_DB = 'Hostel_Mahendra';

const TOLERATED = ['ER_TABLE_EXISTS_ERROR', 'ER_DUP_KEYNAME', 'ER_DUP_FIELDNAME', 'ER_DUP_ENTRY'];

async function main() {
  let conn;
  try {
    conn = await mysql.createConnection(DB);
    console.log(`✓ Connected to MySQL at ${DB.host}:${DB.port} as ${DB.user}\n`);
  } catch (err) {
    console.error(`❌ Could not connect to MySQL at ${DB.host}:${DB.port}: ${err.message}`);
    console.error('   Is the local MySQL server running and are the credentials correct?');
    process.exitCode = 1;
    return;
  }

  try {
    // Guard: make sure the source schema exists
    const [src] = await conn.query(
      `SELECT COUNT(*) AS n FROM information_schema.SCHEMATA WHERE SCHEMA_NAME = ?`, [SOURCE_DB]);
    if (!src[0].n) {
      console.error(`❌ Source schema \`${SOURCE_DB}\` not found on this server. Aborting.`);
      process.exitCode = 1;
      return;
    }

    // STEP 1 — create database
    await conn.query(
      `CREATE DATABASE IF NOT EXISTS \`${TARGET_DB}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci`);
    console.log(`STEP 1 ✓ database \`${TARGET_DB}\` ready\n`);

    // STEP 2 — clone school -> Hostel_Mahendra
    console.log(`STEP 2  cloning \`${SOURCE_DB}\` -> \`${TARGET_DB}\` ...`);
    await conn.query('SET FOREIGN_KEY_CHECKS = 0');
    const [tables] = await conn.query(
      `SELECT TABLE_NAME AS t FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = ? AND TABLE_TYPE = 'BASE TABLE' ORDER BY TABLE_NAME`, [SOURCE_DB]);

    let cloned = 0, copiedRows = 0;
    for (const { t } of tables) {
      await conn.query(`CREATE TABLE IF NOT EXISTS \`${TARGET_DB}\`.\`${t}\` LIKE \`${SOURCE_DB}\`.\`${t}\``);
      // Only copy if the target table is currently empty (keeps it idempotent)
      const [[{ n }]] = await conn.query(`SELECT COUNT(*) AS n FROM \`${TARGET_DB}\`.\`${t}\``);
      if (n === 0) {
        const [res] = await conn.query(
          `INSERT INTO \`${TARGET_DB}\`.\`${t}\` SELECT * FROM \`${SOURCE_DB}\`.\`${t}\``);
        copiedRows += res.affectedRows || 0;
        console.log(`   ✓ ${t}  (+${res.affectedRows || 0} rows)`);
      } else {
        console.log(`   • ${t}  (already has ${n} rows, skipped data copy)`);
      }
      cloned++;
    }
    await conn.query('SET FOREIGN_KEY_CHECKS = 1');
    console.log(`STEP 2 ✓ ${cloned} tables cloned, ${copiedRows} rows copied\n`);

    // STEP 3 — add the 6 missing tables
    console.log('STEP 3  adding the 6 missing tables ...');
    await conn.changeUser({ database: TARGET_DB });
    const sqlPath = path.join(__dirname, '../migrations/create_missing_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8')
      .replace(/--.*$/gm, '')
      .replace(/\/\*[\s\S]*?\*\//g, '');
    const statements = sql.split(';').map(s => s.trim()).filter(Boolean);

    for (const stmt of statements) {
      try {
        await conn.query(stmt);
      } catch (err) {
        if (TOLERATED.includes(err.code)) {
          // expected on re-run
        } else {
          console.error(`   ❌ ${err.message}\n      in: ${stmt.slice(0, 100)}...`);
          throw err;
        }
      }
    }
    console.log('STEP 3 ✓ missing tables ensured\n');

    // VERIFY
    const [[counts]] = await conn.query(
      `SELECT
         (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${SOURCE_DB}' AND TABLE_TYPE='BASE TABLE') AS school_tables,
         (SELECT COUNT(*) FROM information_schema.TABLES WHERE TABLE_SCHEMA = '${TARGET_DB}' AND TABLE_TYPE='BASE TABLE') AS target_tables`);
    const [missing] = await conn.query(
      `SELECT TABLE_NAME FROM information_schema.TABLES
       WHERE TABLE_SCHEMA = '${TARGET_DB}'
         AND TABLE_NAME IN ('room_amenities_master','webhook_api_keys','fee_structure','student_dues','student_fee_payments','room_allocations')
       ORDER BY TABLE_NAME`);

    console.log('='.repeat(50));
    console.log(`school tables:          ${counts.school_tables}`);
    console.log(`Hostel_Mahendra tables: ${counts.target_tables}`);
    console.log(`6 missing tables present (${missing.length}/6): ${missing.map(r => r.TABLE_NAME).join(', ')}`);
    console.log('='.repeat(50));
    console.log('\n✅ Done.');
  } catch (error) {
    console.error('\n❌ Setup failed:', error.message);
    process.exitCode = 1;
  } finally {
    if (conn) await conn.end();
  }
}

main();
