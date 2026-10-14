-- Migration 013: Field GPS Live Tracking & Activity Reports
-- STRICT SAFETY: 100% Additive. No existing tables modified.
-- HISTORY PRESERVATION: ON DELETE RESTRICT prevents accidental deletion of employees with active tracking records.
-- ROLLBACK NOTE: For non-destructive rollback, disable application routes instead of dropping tables to preserve collected data.

CREATE TABLE IF NOT EXISTS field_location_logs (
  id BIGSERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  checkin_id INTEGER REFERENCES vehicle_checkins(id) ON DELETE SET NULL,
  latitude DECIMAL(10, 8) NOT NULL,
  longitude DECIMAL(11, 8) NOT NULL,
  accuracy_meters DECIMAL(8, 2),
  altitude_meters DECIMAL(8, 2),
  speed_mps DECIMAL(6, 2),
  heading DECIMAL(5, 2),
  battery_level DECIMAL(3, 2),
  is_moving BOOLEAN DEFAULT true,
  source VARCHAR(20) DEFAULT 'gps',
  recorded_at TIMESTAMPTZ NOT NULL,
  received_at TIMESTAMPTZ DEFAULT NOW(),
  session_date DATE NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_fll_employee_date ON field_location_logs(employee_id, session_date);
CREATE INDEX IF NOT EXISTS idx_fll_date ON field_location_logs(session_date);
CREATE INDEX IF NOT EXISTS idx_fll_employee_recorded ON field_location_logs(employee_id, recorded_at);
CREATE INDEX IF NOT EXISTS idx_fll_checkin ON field_location_logs(checkin_id);
CREATE INDEX IF NOT EXISTS idx_fll_live ON field_location_logs(employee_id, received_at DESC);

CREATE TABLE IF NOT EXISTS field_tracking_sessions (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER NOT NULL REFERENCES employees(id) ON DELETE RESTRICT,
  vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
  checkin_id INTEGER REFERENCES vehicle_checkins(id) ON DELETE SET NULL,
  session_date DATE NOT NULL,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  total_points INTEGER DEFAULT 0,
  total_distance_meters DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'completed', 'incomplete', 'no_data')),
  last_point_at TIMESTAMPTZ,
  gaps_count INTEGER DEFAULT 0,
  permission_status VARCHAR(30) DEFAULT 'granted',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(employee_id, session_date)
);

CREATE INDEX IF NOT EXISTS idx_fts_employee_date ON field_tracking_sessions(employee_id, session_date);
CREATE INDEX IF NOT EXISTS idx_fts_status ON field_tracking_sessions(status);
