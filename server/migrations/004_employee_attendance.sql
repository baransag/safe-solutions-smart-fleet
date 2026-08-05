-- Migration 004: Employee Attendance & QR Code Management

-- Table for Employee Attendance QR Codes (Office, Site, Temporary)
CREATE TABLE IF NOT EXISTS employee_qr_codes (
  id SERIAL PRIMARY KEY,
  qr_id VARCHAR(50) UNIQUE NOT NULL,
  qr_token VARCHAR(255) UNIQUE NOT NULL,
  name VARCHAR(150) NOT NULL,
  type VARCHAR(30) NOT NULL CHECK (type IN ('office', 'site', 'temporary')),
  project_name VARCHAR(150),
  category VARCHAR(50) DEFAULT 'Head Office',
  lat DECIMAL(10, 8) NOT NULL,
  lng DECIMAL(11, 8) NOT NULL,
  allowed_radius_meters INTEGER NOT NULL DEFAULT 200,
  qr_image_data TEXT,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  expiry_date TIMESTAMP,
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_employee_qr_status ON employee_qr_codes(status);
CREATE INDEX idx_employee_qr_type ON employee_qr_codes(type);
CREATE INDEX idx_employee_qr_token ON employee_qr_codes(qr_token);

-- Add columns to attendance_records for Employee Office & Site Attendance
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS attendance_type VARCHAR(20) DEFAULT 'office' CHECK (attendance_type IN ('office', 'site')),
  ADD COLUMN IF NOT EXISTS qr_code_id INTEGER REFERENCES employee_qr_codes(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS qr_id_scanned VARCHAR(50),
  ADD COLUMN IF NOT EXISTS location_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS project_name VARCHAR(150),
  ADD COLUMN IF NOT EXISTS approval_status VARCHAR(30) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  ADD COLUMN IF NOT EXISTS approved_by INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS approval_notes TEXT,
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP,
  ADD COLUMN IF NOT EXISTS is_late BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS gps_status VARCHAR(50) DEFAULT 'Inside Office',
  ADD COLUMN IF NOT EXISTS distance_meters DECIMAL(10, 2) DEFAULT 0;

CREATE INDEX idx_attendance_approval ON attendance_records(approval_status);
CREATE INDEX idx_attendance_type ON attendance_records(attendance_type);
