-- Migration 003: Vehicle management tables

-- Vehicles registry
CREATE TABLE IF NOT EXISTS vehicles (
  id SERIAL PRIMARY KEY,
  vehicle_id VARCHAR(20) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  number_plate VARCHAR(30) UNIQUE NOT NULL,
  type VARCHAR(30) NOT NULL DEFAULT 'bike' CHECK (type IN ('bike', 'car', 'van', 'truck', 'suv')),
  make VARCHAR(50),
  model VARCHAR(50),
  year INTEGER,
  color VARCHAR(30),
  fuel_type VARCHAR(20) DEFAULT 'petrol' CHECK (fuel_type IN ('petrol', 'diesel', 'electric', 'hybrid', 'cng')),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'maintenance', 'inactive', 'decommissioned')),
  qr_code TEXT,
  image_url VARCHAR(500),
  current_meter DECIMAL(10, 2) DEFAULT 0,
  tank_capacity DECIMAL(6, 2),
  avg_mileage DECIMAL(6, 2),
  insurance_expiry DATE,
  registration_expiry DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicles_status ON vehicles(status);
CREATE INDEX idx_vehicles_type ON vehicles(type);
CREATE INDEX idx_vehicles_active ON vehicles(is_active);
CREATE INDEX idx_vehicles_plate ON vehicles(number_plate);

-- Vehicle assignments (employee <-> vehicle)
CREATE TABLE IF NOT EXISTS vehicle_assignments (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  assigned_by INTEGER REFERENCES employees(id),
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  unassigned_at TIMESTAMP,
  is_current BOOLEAN DEFAULT true,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_assignments_vehicle ON vehicle_assignments(vehicle_id);
CREATE INDEX idx_assignments_employee ON vehicle_assignments(employee_id);
CREATE INDEX idx_assignments_current ON vehicle_assignments(is_current);

-- Vehicle check-ins (morning)
CREATE TABLE IF NOT EXISTS vehicle_checkins (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checkin_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  gps_address TEXT,
  selfie_url VARCHAR(500),
  meter_photo_url VARCHAR(500),
  meter_reading DECIMAL(10, 2) NOT NULL,
  ocr_reading DECIMAL(10, 2),
  ocr_confidence DECIMAL(5, 2),
  ocr_raw_text TEXT,
  is_confirmed BOOLEAN DEFAULT false,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'flagged')),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkins_vehicle ON vehicle_checkins(vehicle_id);
CREATE INDEX idx_checkins_employee ON vehicle_checkins(employee_id);
CREATE INDEX idx_checkins_date ON vehicle_checkins(checkin_time);
CREATE INDEX idx_checkins_status ON vehicle_checkins(status);

-- Vehicle check-outs (evening)
CREATE TABLE IF NOT EXISTS vehicle_checkouts (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  checkin_id INTEGER REFERENCES vehicle_checkins(id),
  checkout_time TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  gps_address TEXT,
  selfie_url VARCHAR(500),
  meter_photo_url VARCHAR(500),
  meter_reading DECIMAL(10, 2) NOT NULL,
  ocr_reading DECIMAL(10, 2),
  ocr_confidence DECIMAL(5, 2),
  ocr_raw_text TEXT,
  opening_km DECIMAL(10, 2),
  closing_km DECIMAL(10, 2),
  distance_km DECIMAL(10, 2),
  duration_minutes INTEGER,
  is_confirmed BOOLEAN DEFAULT false,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_checkouts_vehicle ON vehicle_checkouts(vehicle_id);
CREATE INDEX idx_checkouts_employee ON vehicle_checkouts(employee_id);
CREATE INDEX idx_checkouts_checkin ON vehicle_checkouts(checkin_id);
CREATE INDEX idx_checkouts_date ON vehicle_checkouts(checkout_time);

-- Fuel logs
CREATE TABLE IF NOT EXISTS fuel_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  receipt_photo_url VARCHAR(500),
  pump_name VARCHAR(150),
  fuel_amount DECIMAL(10, 2) NOT NULL,
  liters DECIMAL(8, 2) NOT NULL,
  meter_reading DECIMAL(10, 2),
  gps_lat DECIMAL(10, 8),
  gps_lng DECIMAL(11, 8),
  gps_address TEXT,
  submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  approved_by INTEGER REFERENCES employees(id),
  approval_status VARCHAR(20) DEFAULT 'pending' CHECK (approval_status IN ('pending', 'approved', 'rejected')),
  approval_notes TEXT,
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_fuel_vehicle ON fuel_logs(vehicle_id);
CREATE INDEX idx_fuel_employee ON fuel_logs(employee_id);
CREATE INDEX idx_fuel_status ON fuel_logs(approval_status);
CREATE INDEX idx_fuel_date ON fuel_logs(submitted_at);

-- Vehicle services/maintenance
CREATE TABLE IF NOT EXISTS vehicle_services (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  service_type VARCHAR(50) NOT NULL,
  description TEXT,
  service_date DATE NOT NULL,
  next_service_date DATE,
  next_service_km DECIMAL(10, 2),
  cost DECIMAL(12, 2),
  odometer DECIMAL(10, 2),
  vendor VARCHAR(150),
  invoice_url VARCHAR(500),
  notes TEXT,
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_services_vehicle ON vehicle_services(vehicle_id);
CREATE INDEX idx_services_date ON vehicle_services(service_date);
CREATE INDEX idx_services_next ON vehicle_services(next_service_date);

-- Vehicle alerts (smart validation)
CREATE TABLE IF NOT EXISTS vehicle_alerts (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  alert_type VARCHAR(50) NOT NULL,
  severity VARCHAR(20) DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  is_resolved BOOLEAN DEFAULT false,
  resolved_by INTEGER REFERENCES employees(id),
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_alerts_vehicle ON vehicle_alerts(vehicle_id);
CREATE INDEX idx_alerts_type ON vehicle_alerts(alert_type);
CREATE INDEX idx_alerts_severity ON vehicle_alerts(severity);
CREATE INDEX idx_alerts_resolved ON vehicle_alerts(is_resolved);
CREATE INDEX idx_alerts_date ON vehicle_alerts(created_at);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(30) DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error', 'alert')),
  link VARCHAR(500),
  is_read BOOLEAN DEFAULT false,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_notifications_user ON notifications(user_id);
CREATE INDEX idx_notifications_read ON notifications(is_read);
CREATE INDEX idx_notifications_date ON notifications(created_at);

-- Hero slides
CREATE TABLE IF NOT EXISTS hero_slides (
  id SERIAL PRIMARY KEY,
  title VARCHAR(200),
  description TEXT,
  category VARCHAR(50) DEFAULT 'Holiday Notice',
  image_url VARCHAR(500) NOT NULL,
  link_url VARCHAR(500),
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  sort_order INTEGER DEFAULT 0,
  uploaded_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'Holiday Notice';
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE hero_slides ADD COLUMN IF NOT EXISTS end_date DATE;

CREATE INDEX idx_hero_active ON hero_slides(is_active);

-- Meter reading logs (comprehensive audit trail)
CREATE TABLE IF NOT EXISTS vehicle_meter_logs (
  id SERIAL PRIMARY KEY,
  vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
  employee_id INTEGER REFERENCES employees(id),
  reading DECIMAL(10, 2) NOT NULL,
  source VARCHAR(20) NOT NULL CHECK (source IN ('checkin', 'checkout', 'fuel', 'service', 'manual')),
  reference_id INTEGER,
  reference_type VARCHAR(30),
  photo_url VARCHAR(500),
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_meter_vehicle ON vehicle_meter_logs(vehicle_id);
CREATE INDEX idx_meter_date ON vehicle_meter_logs(recorded_at);
