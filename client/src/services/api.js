const API_BASE = import.meta.env.VITE_API_URL 
  ? `${import.meta.env.VITE_API_URL.replace(/\/$/, '')}/api`
  : '/api';

const MOCK_CLIENT_USERS = [
  { id: 0, employee_id: 'ADMIN001', name: 'SAFE SOLUTIONS Boss', email: 'boss@safesolutions.com', phone: '', role: 'controller', designation: 'Managing Director', department: 'Executive', avatar_url: '/assets/images/logo.jpeg', pass: 'SS@Admin26' },
  { id: 1, employee_id: 'EMP001', name: 'M. Husnain Farooq', email: 'baransag68@gmail.com', phone: '03468760963', role: 'controller', designation: 'Controller', department: 'Management', avatar_url: '/assets/images/Husnain.jpeg', pass: 'Controller@2024' },
  { id: 2, employee_id: 'EMP002', name: 'Samaira Mubashar', email: 'sm.bajwa786fsd@gmail.com', phone: '03006646124', role: 'manager', designation: 'Manager Accounts & Finance', department: 'Finance', avatar_url: '/assets/images/Samaira.jpeg', pass: 'Safe@2024' },
  { id: 3, employee_id: 'EMP003', name: 'Engr. Shahzaib Ahmad', email: 'zaiberana37@gmail.com', phone: '03007684761', role: 'employee', designation: 'Marketing Executive', department: 'Marketing', avatar_url: '/assets/images/Shahzaib.jpeg', pass: 'Safe@2024' },
  { id: 4, employee_id: 'EMP004', name: 'Shahbaz Ahmed', email: 'shabazbutt1132@gmail.com', phone: '03237684200', role: 'employee', designation: 'Application Supervisor', department: 'Operations', avatar_url: '/assets/images/Shahbaz.jpeg', pass: 'Safe@2024' },
  { id: 5, employee_id: 'EMP005', name: 'Rehan Ali', email: 'Arehan079@gmail.com', phone: '03237674000', role: 'employee', designation: 'Application Supervisor', department: 'Operations', avatar_url: '/assets/images/Rehan.jpeg', pass: 'Safe@2024' },
  { id: 6, employee_id: 'EMP006', name: 'Adnan Tahir', email: 'tahiradnan31@gmail.com', phone: '03237864100', role: 'employee', designation: 'ASM', department: 'Sales', avatar_url: '/assets/images/Adnan-Tahir.jpeg', pass: 'Safe@2024' },
  { id: 7, employee_id: 'EMP007', name: 'Adnan Ali', email: 'mianadnanali88@gmail.com', phone: '03217684400', role: 'employee', designation: 'Area Sales Manager', department: 'Sales', avatar_url: '/assets/images/Adnan-Ali.jpeg', pass: 'Safe@2024' },
  { id: 8, employee_id: 'EMP008', name: 'M. Soulat Raza', email: 'mirzasoulat112@gmail.com', phone: '03397684700', role: 'employee', designation: 'Execution Officer', department: 'Operations', avatar_url: '/assets/images/Soulat.jpeg', pass: 'Safe@2024' },
  { id: 9, employee_id: 'EMP009', name: 'Muneeb Ahmad', email: 'muneeb01250@gmail.com', phone: '03077684400', role: 'employee', designation: 'Store & Inventory', department: 'Inventory', avatar_url: '/assets/images/Muneeb.jpeg', pass: 'Safe@2024' },
  { id: 10, employee_id: 'EMP010', name: 'M. Zahid', email: 'muhammadzahid5324@gmail.com', phone: '03079682902', role: 'employee', designation: 'Helper', department: 'Support', avatar_url: '/assets/images/Zahid.jpeg', pass: 'Safe@2024', number_plate: 'FDL-6381-07' },
  { id: 11, employee_id: 'EMP011', name: 'Tajammul Mushtaq', email: 'tajammulbajwa545@gmail.com', phone: '03217684500', role: 'employee', designation: 'Area Sales Manager', department: 'Sales', avatar_url: '/assets/images/Tajammul.jpeg', pass: 'Safe@2024' }
];

const MOCK_VEHICLES = [
  { id: 1, vehicle_id: 'VH-001', name: 'Company Bike', number_plate: 'BBE-5688', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'Engr. Shahzaib Ahmad', emp_id: 'EMP003' },
  { id: 2, vehicle_id: 'VH-002', name: 'Company Bike', number_plate: 'AGN-1227-21', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'Shahbaz Ahmed', emp_id: 'EMP004' },
  { id: 3, vehicle_id: 'VH-003', name: 'Honda CD70', number_plate: 'FDR-203-15', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'Rehan Ali', emp_id: 'EMP005' },
  { id: 4, vehicle_id: 'VH-004', name: 'Company Bike', number_plate: 'AWD-24-3818', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'Adnan Tahir', emp_id: 'EMP006' },
  { id: 5, vehicle_id: 'VH-005', name: 'Company Car', number_plate: 'AHV-378', type: 'car', status: 'active', current_meter: 0, assigned_employee_name: 'Adnan Ali', emp_id: 'EMP007' },
  { id: 6, vehicle_id: 'VH-006', name: 'Company Bike', number_plate: 'BFF-6452/26', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'M. Soulat Raza', emp_id: 'EMP008' },
  { id: 7, vehicle_id: 'VH-007', name: 'Company Bike', number_plate: 'BFF-7907-26', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'Muneeb Ahmad', emp_id: 'EMP009' },
  { id: 8, vehicle_id: 'VH-008', name: 'Company Bike', number_plate: 'FDL-6381-07', type: 'bike', status: 'active', current_meter: 0, assigned_employee_name: 'M. Zahid', emp_id: 'EMP010' },
  { id: 9, vehicle_id: 'VH-009', name: 'Company Car', number_plate: 'FD-17-84', type: 'car', status: 'active', current_meter: 0, assigned_employee_name: 'Tajammul Mushtaq', emp_id: 'EMP011' }
];

const MOCK_SLIDES = [
  { id: 1, image_url: '/assets/images/hero-1.jpeg', title: 'Smart Fleet Operations', description: 'Real-time vehicle tracking & intelligent allocation', category: 'Company Notice' },
  { id: 2, image_url: '/assets/images/hero-2.jpeg', title: 'Automated Verification', description: 'QR code check-in & speedometer validation', category: 'Safety Alert' },
  { id: 3, image_url: '/assets/images/hero-3.jpeg', title: 'Fuel & Maintenance Logs', description: 'Expense tracking and automated maintenance alerts', category: 'Vehicle Maintenance Notice' },
  { id: 4, image_url: '/assets/images/hero-4.jpeg', title: 'Rider Performance & Attendance', description: 'GPS verified check-in & daily route intelligence', category: 'Office Timing' },
  { id: 5, image_url: '/assets/images/hero-5.jpeg', title: 'Enterprise Security', description: 'Tamper-resistant audit trails & fleet control', category: 'Friday Reminder' }
];

class ApiService {
  constructor() {
    this.baseUrl = API_BASE;
  }

  getToken() {
    return localStorage.getItem('token');
  }

  async request(endpoint, options = {}) {
    const token = this.getToken();
    const headers = {
      ...(options.headers || {}),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    try {
      const response = await fetch(`${this.baseUrl}${endpoint}`, {
        ...options,
        headers,
      });

      if (response.status === 401) {
        const refreshed = await this.refreshToken();
        if (refreshed) {
          headers['Authorization'] = `Bearer ${this.getToken()}`;
          const retryResponse = await fetch(`${this.baseUrl}${endpoint}`, { ...options, headers });
          if (retryResponse.ok) return await retryResponse.json();
        }
      }

      const data = await response.json().catch(() => ({}));

      if (response.ok) {
        return data;
      }

      throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
    } catch (netErr) {
      console.error(`API Error [${endpoint}]:`, netErr.message);
      throw netErr;
    }
  }

  async refreshToken() {
    try {
      const refreshToken = localStorage.getItem('refreshToken');
      if (!refreshToken) return false;
      const response = await fetch(`${this.baseUrl}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return false;
      const data = await response.json();
      localStorage.setItem('token', data.token);
      return true;
    } catch {
      return false;
    }
  }

  get(endpoint) {
    return this.request(endpoint);
  }

  post(endpoint, body) {
    return this.request(endpoint, {
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  }

  put(endpoint, body) {
    return this.request(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  patch(endpoint, body) {
    return this.request(endpoint, {
      method: 'PATCH',
      body: JSON.stringify(body),
    });
  }

  delete(endpoint) {
    return this.request(endpoint, { method: 'DELETE' });
  }

  upload(endpoint, formData) {
    return this.request(endpoint, {
      method: 'POST',
      body: formData,
    });
  }
}

const api = new ApiService();
export default api;
