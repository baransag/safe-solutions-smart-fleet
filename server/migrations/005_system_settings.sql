-- Migration 005: System Settings & Module Status Flags
CREATE TABLE IF NOT EXISTS system_settings (
  id SERIAL PRIMARY KEY,
  setting_key VARCHAR(50) UNIQUE NOT NULL,
  setting_value TEXT NOT NULL,
  updated_by INTEGER REFERENCES employees(id),
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed default ENABLED states for Production GO-LIVE
INSERT INTO system_settings (setting_key, setting_value)
VALUES
  ('vehicle_attendance_enabled', 'true'),
  ('employee_attendance_enabled', 'true'),
  ('office_attendance_enabled', 'true'),
  ('site_attendance_enabled', 'true')
ON CONFLICT (setting_key) DO UPDATE SET setting_value = EXCLUDED.setting_value;
