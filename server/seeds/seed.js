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

    // Truncate existing data to cleanly re-populate exact records
    await client.query('TRUNCATE TABLE vehicle_assignments, vehicle_checkouts, vehicle_checkins, fuel_logs, vehicle_services, vehicle_alerts, vehicle_meter_logs, notifications, vehicles, employees RESTART IDENTITY CASCADE');

    // Insert exact employee records as provided
    const employeesData = [
      {
        employee_id: 'EMP001',
        name: 'M.husnain farooq',
        email: 'baransag68@gmail.com',
        phone: '03468760963',
        designation: 'CONRTOLLER',
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
        designation: 'Manager Account & Finance',
        department: 'Finance',
        role: 'manager',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Samaira.jpeg'
      },
      {
        employee_id: 'EMP003',
        name: 'ENGR SHAHZAIB AHMAD',
        email: 'Zaiberana37@gmail.com',
        phone: '03007684761',
        designation: 'Marketing executive',
        department: 'Marketing',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Shahzaib.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'BBE-5688'
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
        bike_name: 'Company Bike',
        number_plate: 'AGN-1227-21'
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
        bike_name: 'Honda Cd70',
        number_plate: 'FDR-203-15'
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
        number_plate: 'AWD - 24- 3818'
      },
      {
        employee_id: 'EMP007',
        name: 'ADNAN ALI',
        email: 'mianadnanali88@gmail.com',
        phone: '03217684400',
        designation: 'Area sales manager',
        department: 'Sales',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Adnan-Ali.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'AHV 378.......'
      },
      {
        employee_id: 'EMP008',
        name: 'M . SOULAT RAZA',
        email: 'mirzasoulat112@gmail.com',
        phone: '03397684700',
        designation: 'Execution Officer',
        department: 'Operations',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Soulat.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'BFF 6452 /26'
      },
      {
        employee_id: 'EMP009',
        name: 'Muneeb Ahmad',
        email: 'muneeb01250@gmail.com',
        phone: '03077684400',
        designation: 'Store & inventory',
        department: 'Inventory',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Muneeb.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'BFF - 7907 -26'
      },
      {
        employee_id: 'EMP010',
        name: 'M.Zahid',
        email: 'muhammadzahid5324@gmail.com',
        phone: '03079682902',
        designation: 'helper',
        department: 'Support',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Zahid.jpeg'
      },
      {
        employee_id: 'EMP011',
        name: 'TAJAMMUL MUSHTAQ',
        email: 'tajammulbajwa545@gmail.com',
        phone: '03217684500',
        designation: 'Area sales manager',
        department: 'Sales',
        role: 'employee',
        password_hash: defaultPassword,
        avatar_url: '/assets/images/Tajammul.jpeg',
        bike_name: 'Company Bike',
        number_plate: 'FD-17-84'
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

    // Insert exact vehicles and assign to respective employees
    console.log('  🏍️ Inserting exact assigned vehicles...');
    let vCount = 1;
    const controllerEmp = insertedEmployees.find(e => e.role === 'controller');

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
            'bike',
            'Honda',
            'CD70',
            2023,
            'Red',
            'petrol',
            1500.00,
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
