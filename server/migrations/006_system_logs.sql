-- Migration 006: System Audit Logs
CREATE TABLE IF NOT EXISTS system_logs (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  module VARCHAR(50) NOT NULL,
  details TEXT,
  ip_address VARCHAR(45),
  user_agent TEXT,
  level VARCHAR(20) DEFAULT 'info' CHECK (level IN ('info', 'warning', 'error', 'security')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_system_logs_employee ON system_logs(employee_id);
CREATE INDEX idx_system_logs_module ON system_logs(module);
CREATE INDEX idx_system_logs_level ON system_logs(level);
CREATE INDEX idx_system_logs_date ON system_logs(created_at);
