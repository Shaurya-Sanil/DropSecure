import bcrypt from 'bcrypt';
import { fileURLToPath } from 'url';
import { pool, query } from './pool.js';
import { runMigrations } from './migrate.js';

const __filename = fileURLToPath(import.meta.url);

export async function seedDatabase() {
  console.log('[SEED] Seeding database with initial data...');

  await runMigrations();

  const saltRounds = 10;
  const adminHash = await bcrypt.hash('Admin@123', saltRounds);
  const guardHash = await bcrypt.hash('Guard@123', saltRounds);
  const deliveryHash = await bcrypt.hash('Delivery@123', saltRounds);
  const studentHash = await bcrypt.hash('Student@123', saltRounds);

  // 1. Insert Users
  const users = [
    {
      email: 'admin@dropsecure.edu',
      password_hash: adminHash,
      name: 'Admin Aisha',
      role: 'ADMIN',
      phone: '+91-9999900001',
      room_number: 'Admin Office 101',
      email_confirmed: true,
    },
    {
      email: 'guard@dropsecure.edu',
      password_hash: guardHash,
      name: 'Gary Guard',
      role: 'GUARD',
      phone: '+91-9999900002',
      room_number: 'Campus Main Gate',
      email_confirmed: true,
    },
    // Delivery Driver
    {
      email: 'delivery@express.com',
      password_hash: deliveryHash,
      name: 'Dave Delivery',
      role: 'DELIVERY',
      phone: '+91-9999900003',
      room_number: 'Courier Hub',
      email_confirmed: true,
    },
    // Campus Bandra Students (Fr. CRCE)
    {
      email: 'alice@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Alice Student',
      role: 'RECIPIENT',
      phone: '+91-9876543210',
      room_number: 'Hostel A-304',
      campus_id: 'CAMPUS-BANDRA',
      email_confirmed: true,
    },
    {
      email: 'rahul@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Rahul Sharma',
      role: 'RECIPIENT',
      phone: '+91-9876543213',
      room_number: 'Hostel B-201',
      campus_id: 'CAMPUS-BANDRA',
      email_confirmed: true,
    },
    {
      email: 'priya@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Priya Patel',
      role: 'RECIPIENT',
      phone: '+91-9876543214',
      room_number: 'Hostel A-102',
      campus_id: 'CAMPUS-BANDRA',
      email_confirmed: true,
    },
    {
      email: 'neil@student.dropsecure.edu',
      password_hash: studentHash,
      name: "Neil D'Souza",
      role: 'RECIPIENT',
      phone: '+91-9876543215',
      room_number: 'Hostel C-405',
      campus_id: 'CAMPUS-BANDRA',
      email_confirmed: true,
    },
    // Campus Vashi Students (Fr. CRIT)
    {
      email: 'bob@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Bob Scholar',
      role: 'RECIPIENT',
      phone: '+91-9876543211',
      room_number: 'Agnel Tech Hostel V-201',
      campus_id: 'CAMPUS-VASHI',
      email_confirmed: true,
    },
    {
      email: 'sneha@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Sneha Kulkarni',
      role: 'RECIPIENT',
      phone: '+91-9876543216',
      room_number: 'Agnel Tech Hostel V-305',
      campus_id: 'CAMPUS-VASHI',
      email_confirmed: true,
    },
    {
      email: 'rohan@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Rohan Deshmukh',
      role: 'RECIPIENT',
      phone: '+91-9876543217',
      room_number: 'Tech Wing V-104',
      campus_id: 'CAMPUS-VASHI',
      email_confirmed: true,
    },
    {
      email: 'tanvi@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Tanvi Patil',
      role: 'RECIPIENT',
      phone: '+91-9876543218',
      room_number: 'Tech Wing V-208',
      campus_id: 'CAMPUS-VASHI',
      email_confirmed: true,
    },
    // Campus Nerul Students (Agnel Polytechnic & Research)
    {
      email: 'charlie@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Charlie Tech',
      role: 'RECIPIENT',
      phone: '+91-9876543212',
      room_number: 'Nerul Complex N-105',
      campus_id: 'CAMPUS-NERUL',
      email_confirmed: true,
    },
    {
      email: 'ananya@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Ananya Iyer',
      role: 'RECIPIENT',
      phone: '+91-9876543219',
      room_number: 'Nerul Complex N-204',
      campus_id: 'CAMPUS-NERUL',
      email_confirmed: true,
    },
    {
      email: 'aditya@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Aditya Verma',
      role: 'RECIPIENT',
      phone: '+91-9876543220',
      room_number: 'Nerul Poly Hostel N-302',
      campus_id: 'CAMPUS-NERUL',
      email_confirmed: true,
    },
    {
      email: 'riya@student.dropsecure.edu',
      password_hash: studentHash,
      name: 'Riya Sen',
      role: 'RECIPIENT',
      phone: '+91-9876543221',
      room_number: 'Nerul Poly Hostel N-112',
      campus_id: 'CAMPUS-NERUL',
      email_confirmed: true,
    },
  ];

  const userMap = new Map<string, string>();

  for (const u of users) {
    const campusId = (u as any).campus_id || 'CAMPUS-BANDRA';
    const res = await query(
      `INSERT INTO users (email, password_hash, name, role, phone, room_number, campus_id, email_confirmed)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       ON CONFLICT (email) DO UPDATE SET 
         name = EXCLUDED.name,
         role = EXCLUDED.role,
         phone = EXCLUDED.phone,
         room_number = EXCLUDED.room_number,
         campus_id = EXCLUDED.campus_id,
         email_confirmed = EXCLUDED.email_confirmed
       RETURNING id, email`,
      [u.email, u.password_hash, u.name, u.role, u.phone, u.room_number, campusId, u.email_confirmed]
    );
    userMap.set(u.email, res.rows[0].id);
  }

  const deliveryId = userMap.get('delivery@express.com')!;
  const aliceId = userMap.get('alice@student.dropsecure.edu')!;
  const rahulId = userMap.get('rahul@student.dropsecure.edu')!;
  const bobId = userMap.get('bob@student.dropsecure.edu')!;
  const snehaId = userMap.get('sneha@student.dropsecure.edu')!;
  const charlieId = userMap.get('charlie@student.dropsecure.edu')!;
  const ananyaId = userMap.get('ananya@student.dropsecure.edu')!;
  const guardId = userMap.get('guard@dropsecure.edu')!;

  // Demo OTP: '123456' for instant demo test
  const demoOtpHash = await bcrypt.hash('123456', 10);

  // 2. Demo Parcels across all 3 Campuses

  // CAMPUS-BANDRA: Ready PENDING parcel for Alice (Demo OTP: 123456, Locker L-01)
  const readyParcelRes = await query(
    `INSERT INTO parcels (
       tracking_code, recipient_id, dropped_by_id, image_key, 
       status, otp_hash, otp_expires_at, otp_attempts, reminder_count, 
       notes, carrier, campus_id, locker_number, locker_size, package_condition, created_at
     )
     VALUES ($1, $2, $3, $4, 'PENDING', $5, NOW() + INTERVAL '48 HOURS', 0, 0, $6, 'BlueDart', 'CAMPUS-BANDRA', 'L-01', 'MEDIUM', 'INTACT', NOW() - INTERVAL '1 HOUR')
     ON CONFLICT (tracking_code) DO UPDATE SET otp_hash = EXCLUDED.otp_hash, locker_number = 'L-01'
     RETURNING id`,
    [
      'DS-READY-101',
      aliceId,
      deliveryId,
      'demo/sample-electronics.jpg',
      demoOtpHash,
      'Amazon electronics box for Alice (Locker L-01, Demo OTP is 123456)',
    ]
  );

  // CAMPUS-BANDRA: Second pending parcel for Rahul (Locker L-03)
  await query(
    `INSERT INTO parcels (
       tracking_code, recipient_id, dropped_by_id, image_key, 
       status, otp_hash, otp_expires_at, otp_attempts, reminder_count, 
       notes, carrier, campus_id, locker_number, locker_size, package_condition, created_at
     )
     VALUES ($1, $2, $3, $4, 'PENDING', $5, NOW() + INTERVAL '40 HOURS', 0, 0, $6, 'Amazon', 'CAMPUS-BANDRA', 'L-03', 'LARGE', 'INTACT', NOW() - INTERVAL '4 HOURS')
     ON CONFLICT (tracking_code) DO UPDATE SET locker_number = 'L-03'`,
    [
      'DS-BANDRA-202',
      rahulId,
      deliveryId,
      'demo/sample-apparel.jpg',
      demoOtpHash,
      'Engineering textbook parcel deposited in locker L-03',
    ]
  );

  // CAMPUS-VASHI: Stale Parcel (>24h ago) for Bob to demonstrate the Lambda Daily Sweep rule (Locker L-02)
  await query(
    `INSERT INTO parcels (
       tracking_code, recipient_id, dropped_by_id, image_key, 
       status, otp_hash, otp_expires_at, otp_attempts, reminder_count, 
       notes, carrier, campus_id, locker_number, locker_size, package_condition, created_at
     )
     VALUES ($1, $2, $3, $4, 'PENDING', $5, NOW() + INTERVAL '22 HOURS', 0, 0, $6, 'Delhivery', 'CAMPUS-VASHI', 'L-02', 'MEDIUM', 'INTACT', NOW() - INTERVAL '26 HOURS')
     ON CONFLICT (tracking_code) DO UPDATE SET locker_number = 'L-02'`,
    [
      'DS-STALE-901',
      bobId,
      deliveryId,
      'demo/sample-book-box.jpg',
      demoOtpHash,
      'Textbook Package from Academic Press (Pending > 24 hours in Vashi Hub)',
    ]
  );

  // CAMPUS-VASHI: Active Parcel for Sneha (Locker L-04)
  await query(
    `INSERT INTO parcels (
       tracking_code, recipient_id, dropped_by_id, image_key, 
       status, otp_hash, otp_expires_at, otp_attempts, reminder_count, 
       notes, carrier, campus_id, locker_number, locker_size, package_condition, created_at
     )
     VALUES ($1, $2, $3, $4, 'PENDING', $5, NOW() + INTERVAL '45 HOURS', 0, 0, $6, 'Flipkart', 'CAMPUS-VASHI', 'L-04', 'SMALL', 'INTACT', NOW() - INTERVAL '2 HOURS')
     ON CONFLICT (tracking_code) DO UPDATE SET locker_number = 'L-04'`,
    [
      'DS-VASHI-303',
      snehaId,
      deliveryId,
      'demo/sample-electronics.jpg',
      demoOtpHash,
      'Electronics project components for Sneha in Vashi Station #2',
    ]
  );

  // CAMPUS-NERUL: Active Parcel for Charlie (Locker L-05)
  await query(
    `INSERT INTO parcels (
       tracking_code, recipient_id, dropped_by_id, image_key, 
       status, otp_hash, otp_expires_at, otp_attempts, reminder_count, 
       notes, carrier, campus_id, locker_number, locker_size, package_condition, created_at
     )
     VALUES ($1, $2, $3, $4, 'PENDING', $5, NOW() + INTERVAL '46 HOURS', 0, 0, $6, 'Swiggy', 'CAMPUS-NERUL', 'L-05', 'SMALL', 'INTACT', NOW() - INTERVAL '1 HOUR')
     ON CONFLICT (tracking_code) DO UPDATE SET locker_number = 'L-05'`,
    [
      'DS-NERUL-404',
      charlieId,
      deliveryId,
      'demo/sample-apparel.jpg',
      demoOtpHash,
      'Urgent lab documentation parcel for Charlie in Nerul Station #3',
    ]
  );

  // Notifications in outbox
  await query(
    `INSERT INTO outbox_notifications (recipient_id, recipient_email, subject, message)
     VALUES 
       ($1, 'alice@student.dropsecure.edu', '[DropSecure] Fr. CRCE Bandra: Parcel Arrived at Locker L-01', 'Hello Alice! Your package DS-READY-101 is ready in Locker L-01 at Station #1. Pickup OTP: 123456 (or use Dynamic QR in your student portal).'),
       ($2, 'rahul@student.dropsecure.edu', '[DropSecure] Fr. CRCE Bandra: Parcel Arrived at Locker L-03', 'Hello Rahul! Your package DS-BANDRA-202 is ready in Locker L-03 at Station #1. Pickup OTP: 123456.'),
       ($3, 'bob@student.dropsecure.edu', '[DropSecure] Fr. CRIT Vashi: Stale Parcel Reminder for Locker L-02', 'Hello Bob! Your package DS-STALE-901 has been in Locker L-02 for over 24 hours. Please collect soon.'),
       ($4, 'sneha@student.dropsecure.edu', '[DropSecure] Fr. CRIT Vashi: Parcel Arrived at Locker L-04', 'Hello Sneha! Your package DS-VASHI-303 is ready in Locker L-04 at Station #2. Pickup OTP: 123456.'),
       ($5, 'charlie@student.dropsecure.edu', '[DropSecure] Agnel Nerul: Parcel Arrived at Locker L-05', 'Hello Charlie! Your package DS-NERUL-404 is ready in Locker L-05 at Station #3. Pickup OTP: 123456.')
     ON CONFLICT DO NOTHING`,
    [aliceId, rahulId, bobId, snehaId, charlieId]
  );

  // Historical COLLECTED parcel in Bandra
  await query(
    `INSERT INTO parcels (
       tracking_code, recipient_id, dropped_by_id, image_key, 
       status, otp_hash, otp_expires_at, otp_attempts, reminder_count, 
       notes, carrier, campus_id, locker_number, locker_size, package_condition,
       collected_at, verified_by_id, created_at
     )
     VALUES ($1, $2, $3, $4, 'COLLECTED', $5, NOW() + INTERVAL '48 HOURS', 1, 0, $6, 'Amazon', 'CAMPUS-BANDRA', 'L-06', 'MEDIUM', 'INTACT', NOW() - INTERVAL '2 HOURS', $7, NOW() - INTERVAL '5 HOURS')
     ON CONFLICT (tracking_code) DO NOTHING`,
    [
      'DS-HIST-001',
      aliceId,
      deliveryId,
      'demo/sample-apparel.jpg',
      demoOtpHash,
      'Clothing parcel delivered earlier today',
      guardId,
    ]
  );

  console.log('[SEED] Database seeded successfully with demo users and sample parcels!');
}

if (process.argv[1] === __filename) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
