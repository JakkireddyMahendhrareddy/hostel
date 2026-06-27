// Seeds a complete, coherent demo dataset into Hostel_Mahendra so the web app works:
//   owner (with known login) -> hostel -> rooms -> students -> income -> expenses
// Also adds the hostel_master columns the code expects (admission_fee, total_floors, amenities).
// Safe to re-run: if the demo hostel already exists, it does nothing.

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const DB = { host: 'localhost', user: 'root', password: 'Mahi@0712', database: 'Hostel_Mahendra' };
const OWNER = { email: 'owner@hostelhub.com', phone: '9000000001', full_name: 'Demo Owner', password: 'owner123' };
const HOSTEL_NAME = 'HostelHub Demo Hostel';

async function columnExists(c, table, col) {
  const [r] = await c.query(
    'SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME=? AND COLUMN_NAME=?',
    [table, col],
  );
  return r.length > 0;
}

(async () => {
  const c = await mysql.createConnection(DB);
  try {
    // 1) Ensure hostel_master has the columns the controllers select/insert
    if (!(await columnExists(c, 'hostel_master', 'admission_fee')))
      await c.query('ALTER TABLE hostel_master ADD COLUMN admission_fee DECIMAL(10,2) DEFAULT 0.00');
    if (!(await columnExists(c, 'hostel_master', 'total_floors')))
      await c.query('ALTER TABLE hostel_master ADD COLUMN total_floors INT NULL');
    if (!(await columnExists(c, 'hostel_master', 'amenities')))
      await c.query('ALTER TABLE hostel_master ADD COLUMN amenities TEXT NULL');
    console.log('✓ hostel_master columns ensured (admission_fee, total_floors, amenities)');

    // 2) Owner
    const [existingOwner] = await c.query('SELECT user_id FROM users WHERE email=?', [OWNER.email]);
    let ownerId;
    if (existingOwner.length) {
      ownerId = existingOwner[0].user_id;
      console.log(`• owner already exists (user_id=${ownerId})`);
    } else {
      const hash = bcrypt.hashSync(OWNER.password, 10);
      const [r] = await c.query(
        'INSERT INTO users (email, phone, full_name, password_hash, role_id, is_active) VALUES (?,?,?,?,2,1)',
        [OWNER.email, OWNER.phone, OWNER.full_name, hash],
      );
      ownerId = r.insertId;
      console.log(`✓ owner created (user_id=${ownerId})`);
    }

    // 3) Hostel (skip everything if already seeded)
    const [existingHostel] = await c.query('SELECT hostel_id FROM hostel_master WHERE hostel_name=?', [HOSTEL_NAME]);
    if (existingHostel.length) {
      console.log(`⚠ demo hostel already exists (hostel_id=${existingHostel[0].hostel_id}); nothing else to seed.`);
      return;
    }
    const [hr] = await c.query(
      `INSERT INTO hostel_master
       (hostel_name, owner_id, hostel_type, address, city, state, pincode, admission_fee, total_floors, amenities, contact_number, email, is_active)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1)`,
      [
        HOSTEL_NAME, ownerId, 'Co-ed',
        '12-3-45, Tech Park Road, Gachibowli', 'Hyderabad', 'Telangana', '500032',
        2000.0, 4, JSON.stringify(['WiFi', 'AC', 'Laundry', 'Meals', 'Security']),
        OWNER.phone, OWNER.email,
      ],
    );
    const hostelId = hr.insertId;
    console.log(`✓ hostel created (hostel_id=${hostelId})`);

    // 4) Link owner -> hostel (single hostel per owner)
    await c.query('UPDATE users SET hostel_id=? WHERE user_id=?', [hostelId, ownerId]);
    console.log('✓ owner linked to hostel');

    // 5) Rooms  (room_type_id: 1=Single,2=Double,3=Triple,4=Four Sharing,5=Dormitory)
    const rooms = [
      { num: '101', type: 1, floor: 1, rent: 6000 },
      { num: '102', type: 2, floor: 1, rent: 4500 },
      { num: '201', type: 2, floor: 2, rent: 4500 },
      { num: '202', type: 3, floor: 2, rent: 4000 },
      { num: '301', type: 4, floor: 3, rent: 3500 },
      { num: '302', type: 3, floor: 3, rent: 4000 },
    ];
    const roomIds = {};
    for (const r of rooms) {
      const [rr] = await c.query(
        `INSERT INTO rooms (hostel_id, room_number, room_type_id, floor_number, occupied_beds, rent_per_bed, is_available, amenities)
         VALUES (?,?,?,?,0,?,1,?)`,
        [hostelId, r.num, r.type, r.floor, r.rent, 'WiFi, Attached Bathroom'],
      );
      roomIds[r.num] = rr.insertId;
    }
    console.log(`✓ ${rooms.length} rooms created`);

    // 6) Students (active: status=1)
    const students = [
      { fn: 'Ravi', ln: 'Kumar', g: 'Male', ph: '9876500001', room: '101', rent: 6000 },
      { fn: 'Anil', ln: 'Reddy', g: 'Male', ph: '9876500002', room: '102', rent: 4500 },
      { fn: 'Sita', ln: 'Sharma', g: 'Female', ph: '9876500003', room: '201', rent: 4500 },
      { fn: 'Kiran', ln: 'Varma', g: 'Male', ph: '9876500004', room: '202', rent: 4000 },
      { fn: 'Priya', ln: 'Nair', g: 'Female', ph: '9876500005', room: '301', rent: 3500 },
    ];
    const admission = new Date().toISOString().slice(0, 10);
    const floorOf = (num) => rooms.find((r) => r.num === num).floor;
    const occ = {};
    for (const s of students) {
      await c.query(
        `INSERT INTO students
         (hostel_id, room_id, floor_number, monthly_rent, first_name, last_name, gender, phone,
          guardian_name, guardian_phone, permanent_address, admission_date, status, admission_status, id_proof_status)
         VALUES (?,?,?,?,?,?,?,?,?,?,?,?,1,1,1)`,
        [
          hostelId, roomIds[s.room], floorOf(s.room), s.rent, s.fn, s.ln, s.g, s.ph,
          `Guardian of ${s.fn}`, '9000' + s.ph.slice(4), 'Hyderabad, Telangana', admission,
        ],
      );
      occ[s.room] = (occ[s.room] || 0) + 1;
    }
    console.log(`✓ ${students.length} students created`);

    // 7) Sync room occupancy
    for (const [num, count] of Object.entries(occ)) {
      await c.query('UPDATE rooms SET occupied_beds=? WHERE room_id=?', [count, roomIds[num]]);
    }
    console.log('✓ room occupancy updated');

    // 8) Income (current month)  (payment_mode_id: 1=Cash,2=UPI,...)
    const ym = admission.slice(0, 7);
    const incomes = [
      { d: `${ym}-03`, amt: 6000, src: 'Room Rent - Ravi Kumar', pm: 2 },
      { d: `${ym}-05`, amt: 4500, src: 'Room Rent - Anil Reddy', pm: 1 },
      { d: `${ym}-08`, amt: 2000, src: 'Admission Fee - Priya Nair', pm: 2 },
    ];
    for (const i of incomes) {
      await c.query(
        'INSERT INTO income (hostel_id, income_date, amount, source, payment_mode_id, description) VALUES (?,?,?,?,?,?)',
        [hostelId, i.d, i.amt, i.src, i.pm, 'Demo income record'],
      );
    }
    console.log(`✓ ${incomes.length} income records created`);

    // 9) Expenses (current month)  (category_id: 1=Electricity,4=Salary,5=Groceries,...)
    const expenses = [
      { d: `${ym}-04`, amt: 3500, cat: 1, v: 'TSSPDCL', desc: 'Electricity bill' },
      { d: `${ym}-06`, amt: 1200, cat: 5, v: 'Local Store', desc: 'Monthly groceries' },
      { d: `${ym}-07`, amt: 15000, cat: 4, v: 'Staff', desc: 'Cook & helper salary' },
    ];
    for (const e of expenses) {
      await c.query(
        `INSERT INTO expenses (hostel_id, category_id, expense_date, amount, payment_mode_id, vendor_name, description, created_by)
         VALUES (?,?,?,?,?,?,?,?)`,
        [hostelId, e.cat, e.d, e.amt, 1, e.v, e.desc, ownerId],
      );
    }
    console.log(`✓ ${expenses.length} expense records created`);

    console.log('\n✅ Demo data seeded successfully.');
    console.log('────────────────────────────────────────');
    console.log(`Login (web):  ${OWNER.email}   password: ${OWNER.password}`);
    console.log(`        (or phone ${OWNER.phone})`);
    console.log(`Hostel: ${HOSTEL_NAME}  (hostel_id=${hostelId}, owner user_id=${ownerId})`);
    console.log('────────────────────────────────────────');
  } catch (e) {
    console.error('❌ Seed failed:', e.message);
    process.exitCode = 1;
  } finally {
    await c.end();
  }
})();
