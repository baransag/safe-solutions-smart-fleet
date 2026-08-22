require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const bcrypt = require('bcryptjs');
const { pool } = require('../src/config/db');
const QRCode = require('qrcode');

async function seed() {
  const client = await pool.connect();

  try {
    console.log('🌱 Seeding exact production employee database...\n');

    // Hash passwords
    const defaultPassword = await bcrypt.hash('Safe@2024', 12);
    const controllerPassword = await bcrypt.hash('Controller@2024', 12);
    const bossPassword = await bcrypt.hash('SS@Admin26', 12);
    const adminPassword = await bcrypt.hash('Admin@2024', 12);

    // Truncate existing data to cleanly re-populate exact records
    await client.query('TRUNCATE TABLE vehicle_assignments, vehicle_checkouts, vehicle_checkins, fuel_logs, vehicle_services, vehicle_alerts, vehicle_meter_logs, notifications, vehicles, attendance_records, employee_qr_codes, system_logs, employees RESTART IDENTITY CASCADE');

    // Insert exact employee records as provided in Master List
    const employeesData = [
      {
        employee_id: 'SYSADMIN001',
        name: 'System Admin',
        email: 'admin@safesolutions.com',
        phone: '03000000000',
        designation: 'System Administrator',
        department: 'IT',
        role: 'admin',
        password_hash: adminPassword,
        avatar_url: '/assets/images/logo.jpeg'
      },
      {
        employee_id: 'ADMIN001',
        name: 'SAFE SOLUTIONS Boss',
        email: 'boss@safesolutions.com',
        phone: '03001112233',
        designation: 'Managing Director',
        department: 'Executive',
        role: 'boss',
        password_hash: bossPassword,
        avatar_url: '/assets/images/logo.jpeg'
      },
      {
        employee_id: 'EMP001',
        name: 'M. Husnain Farooq',
        email: 'baransag68@gmail.com',
        phone: '03468760963',
        designation: 'Controller',
        department: 'Management',
        role: 'controller',
        password_hash: controllerPassword,
        avatar_url: '/assets/images/Husnain.jpeg'
      },
      {
        employee_id: 'EMP002',
        name: 'Samaira Mubashar',
        email: 'sm.bajwa786fsd@gmail.com',
        phone: '03006646124',
        designation: 'Manager Accounts & Finance',
        department: 'Finance',
        role: 'manager',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Samaira.jpeg'
      },
      {
        employee_id: 'EMP003',
        name: 'Engr. Shahzaib Ahmad',
        email: 'zaiberana37@gmail.com',
        phone: '03007684761',
        designation: 'Marketing Executive',
        department: 'Marketing',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Shahzaib.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'BBE-5688',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP004',
        name: 'Shahbaz Ahmed',
        email: 'shabazbutt1132@gmail.com',
        phone: '03237684200',
        designation: 'Application Supervisor',
        department: 'Operations',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Shahbaz.jpeg',
        bike_name: 'Company / Personal Bike',
        number_plate: 'AGN-1227-21',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP005',
        name: 'Rehan Ali',
        email: 'Arehan079@gmail.com',
        phone: '03237674000',
        designation: 'Application Supervisor',
        department: 'Operations',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Rehan.jpeg',
        bike_name: 'Honda CD70',
        number_plate: 'FDR-203-15',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP006',
        name: 'Adnan Tahir',
        email: 'tahiradnan31@gmail.com',
        phone: '03237864100',
        designation: 'ASM',
        department: 'Sales',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Adnan-Tahir.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'AWD-24-3818',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP007',
        name: 'Adnan Ali',
        email: 'mianadnanali88@gmail.com',
        phone: '03217684400',
        designation: 'Area Sales Manager',
        department: 'Sales',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Adnan-Ali.jpeg',
        bike_name: 'Company Car',
        number_plate: 'AHV-378',
        vehicle_type: 'car'
      },
      {
        employee_id: 'EMP008',
        name: 'M. Soulat Raza',
        email: 'mirzasoulat112@gmail.com',
        phone: '03397684700',
        designation: 'Execution Officer',
        department: 'Operations',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Soulat.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'BFF-6452/26',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP009',
        name: 'Muneeb Ahmad',
        email: 'muneeb01250@gmail.com',
        phone: '03077684400',
        designation: 'Store & Inventory',
        department: 'Inventory',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Muneeb.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'BFF-7907-26',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP010',
        name: 'M. Zahid',
        email: 'muhammadzahid5324@gmail.com',
        phone: '03079682902',
        designation: 'Helper',
        department: 'Support',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Zahid.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'FDL-6381-07',
        vehicle_type: 'bike'
      },
      {
        employee_id: 'EMP011',
        name: 'Tajammul Mushtaq',
        email: 'tajammulbajwa545@gmail.com',
        phone: '03217684500',
        designation: 'Area Sales Manager',
        department: 'Sales',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Tajammul.jpeg',
        bike_name: 'Company Car',
        number_plate: 'FD-17-84',
        vehicle_type: 'car'
      }
    ];

    console.log('  👥 Inserting exact employees...');
    const insertedEmployees = [];
    for (const emp of employeesData) {
      const res = await client.query(
        `INSERT INTO employees (employee_id, name, email, phone, designation, department, role, password_hash, avatar_url)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
         RETURNING id, employee_id, name, email, role`,
        [
          emp.employee_id,
          emp.name,
          emp.email,
          emp.phone,
          emp.designation,
          emp.department,
          emp.role,
          emp.password_hash,
          emp.avatar_url
        ]
      );
      insertedEmployees.push({ ...emp, db_id: res.rows[0].id });
    }
    console.log(`  ✅ ${insertedEmployees.length} employees inserted with exact details.`);

    const controllerEmp = insertedEmployees.find(e => e.role === 'controller') || insertedEmployees[0];

    // Seed Employee QR Codes (Only ONE permanent Head Office QR)
    console.log('  📌 Seeding Employee Attendance QR Codes...');
    const sampleQRs = [
      {
        qr_id: 'QR-OFFICE-001',
        qr_token: 'OFFICE_TOK_HQ_9981273948',
        name: 'Head Office Faisalabad',
        type: 'office',
        project_name: 'SAFE SOLUTIONS HQ',
        category: 'Head Office',
        lat: 31.4504,
        lng: 73.1350,
        radius: 200,
        status: 'active'
      }
    ];

    const insertedQRs = [];
    for (const qr of sampleQRs) {
      const qrDataUrl = await QRCode.toDataURL(JSON.stringify({
        qr_id: qr.qr_id,
        qr_token: qr.qr_token,
        name: qr.name,
        type: qr.type,
        project_name: qr.project_name,
        system: 'SAFE_SOLUTIONS_OPS'
      }), { width: 400, margin: 2, color: { dark: '#021C4F', light: '#FFFFFF' } });

      const qrRes = await client.query(
        `INSERT INTO employee_qr_codes (qr_id, qr_token, name, type, project_name, category, lat, lng, allowed_radius_meters, qr_image_data, status, created_by)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, qr_id, name`,
        [qr.qr_id, qr.qr_token, qr.name, qr.type, qr.project_name, qr.category, qr.lat, qr.lng, qr.radius, qrDataUrl, qr.status, controllerEmp.db_id]
      );
      insertedQRs.push(qrRes.rows[0]);
    }
    console.log(`  ✅ ${insertedQRs.length} Employee QR Codes generated.`);

    // Insert exact vehicles and assign to respective employees
    console.log('  🏍️ Inserting exact assigned vehicles...');
    let vCount = 1;

    for (const emp of insertedEmployees) {
      if (emp.number_plate) {
        const vehicleIdStr = `VH-00${vCount++}`;
        const bikeName = emp.bike_name || 'Company Bike';
        const qrData = JSON.stringify({
          vehicleId: vehicleIdStr,
          name: `${bikeName} - ${emp.name}`,
          numberPlate: emp.number_plate,
          system: 'SAFE_SOLUTIONS'
        });

        const qrCode = await QRCode.toDataURL(qrData, {
          width: 400, margin: 2,
          color: { dark: '#3B2621', light: '#FFFFFF' }
        });

        const vRes = await client.query(
          `INSERT INTO vehicles (vehicle_id, name, number_plate, type, make, model, year, color, fuel_type, current_meter, qr_code)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
           RETURNING id`,
          [
            vehicleIdStr,
            `${bikeName} - ${emp.name}`,
            emp.number_plate,
            emp.vehicle_type || 'bike',
            'Honda',
            'CD70',
            2023,
            'Red',
            'petrol',
            0.00,
            qrCode
          ]
        );

        // Assign vehicle to employee
        await client.query(
          `INSERT INTO vehicle_assignments (vehicle_id, employee_id, assigned_by, is_current)
           VALUES ($1, $2, $3, true)`,
          [vRes.rows[0].id, emp.db_id, controllerEmp.db_id]
        );
      }
    }
    console.log('  ✅ Vehicles and assignments populated.');

    // Seed Sample Attendance Records
    console.log('  🕒 Seeding Employee Attendance Records...');
    const shahzaib = insertedEmployees.find(e => e.employee_id === 'EMP003');
    const shahbaz = insertedEmployees.find(e => e.employee_id === 'EMP004');
    const hqQr = insertedQRs.find(q => q.qr_id === 'QR-OFFICE-001');
    const siteQr = insertedQRs.find(q => q.qr_id === 'QR-SITE-101');

    if (shahzaib && hqQr) {
      await client.query(
        `INSERT INTO attendance_records (employee_id, check_in_time, check_in_lat, check_in_lng, status, attendance_type, qr_code_id, qr_id_scanned, location_name, approval_status, approved_by, approved_at, gps_status, distance_meters)
         VALUES ($1, NOW() - INTERVAL '3 hours', 31.4504, 73.1350, 'present', 'office', $2, $3, 'Head Office Faisalabad', 'approved', $4, NOW(), 'Inside Office', 15.4)`,
        [shahzaib.db_id, hqQr.id, hqQr.qr_id, controllerEmp.db_id]
      );
    }

    if (shahbaz && siteQr) {
      await client.query(
        `INSERT INTO attendance_records (employee_id, check_in_time, check_in_lat, check_in_lng, status, attendance_type, qr_code_id, qr_id_scanned, location_name, project_name, approval_status, gps_status, distance_meters)
         VALUES ($1, NOW() - INTERVAL '1 hour', 31.4200, 73.0800, 'present', 'site', $2, $3, 'Client Plant #4 Site', 'Industrial Zone Waterproofing Project', 'pending', 'Inside Site', 24.8)`,
        [shahbaz.db_id, siteQr.id, siteQr.qr_id]
      );
    }
    console.log('  ✅ Sample Attendance Records seeded.');

    // Insert Default Hero Slides referencing assets/images
    console.log('  🖼️ Setting up hero slides...');
    const heroSlides = [
      { title: 'SAFE SOLUTIONS Smart Fleet Management', desc: 'Real-time vehicle tracking, attendance, and fleet analytics', img: '/assets/images/hero-1.jpeg', order: 1 },
      { title: 'Automated QR Check-In & Verification', desc: 'Instant morning check-in and speedometer validation', img: '/assets/images/hero-2.jpeg', order: 2 },
      { title: 'Fuel Management & Cost Tracking', desc: 'Monitor fuel logs, mileage efficiency, and expenses', img: '/assets/images/hero-3.jpeg', order: 3 },
      { title: 'Rider Performance & Attendance', desc: 'GPS-verified attendance and daily route intelligence', img: '/assets/images/hero-4.jpeg', order: 4 },
      { title: 'Enterprise Fleet Security', desc: 'Complete operational control and safety compliance', img: '/assets/images/hero-5.jpeg', order: 5 }
    ];

    for (const slide of heroSlides) {
      await client.query(
        `INSERT INTO hero_slides (title, description, image_url, is_active, sort_order)
         VALUES ($1, $2, $3, true, $4)`,
        [slide.title, slide.desc, slide.img, slide.order]
      );
    }

    console.log('\n✅ Exact Seed Complete!\n');
  } catch (err) {
    console.error('Seed error:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch(() => process.exit(1));
