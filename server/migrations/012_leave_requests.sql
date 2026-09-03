-- Migration 012: Leave & Half-Day Requests Table
CREATE TABLE IF NOT EXISTS leave_requests (
  id SERIAL PRIMARY KEY,
  employee_id INT REFERENCES employees(id) ON DELETE CASCADE,
  request_type VARCHAR(50) NOT NULL DEFAULT 'full_day', -- 'full_day', 'half_day', 'short_leave'
  half_day_slot VARCHAR(50) DEFAULT 'none', -- 'first_half_morning', 'second_half_afternoon', 'none'
  leave_reason VARCHAR(100) NOT NULL DEFAULT 'casual', -- 'casual', 'sick', 'emergency', 'annual', 'official'
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_days NUMERIC(4, 1) DEFAULT 1.0,
  notes TEXT,
  emergency_phone VARCHAR(50),
  status VARCHAR(30) NOT NULL DEFAULT 'pending', -- 'pending', 'approved', 'rejected'
  manager_remarks TEXT,
  actioned_by INT REFERENCES employees(id),
  actioned_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_leave_requests_emp ON leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_leave_requests_status ON leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_leave_requests_dates ON leave_requests(start_date, end_date);
