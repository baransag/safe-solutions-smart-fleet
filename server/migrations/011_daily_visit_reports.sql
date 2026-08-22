-- Create daily_visit_reports table
CREATE TABLE IF NOT EXISTS daily_visit_reports (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  sales_person_name VARCHAR(255) NOT NULL,
  visit_date DATE NOT NULL DEFAULT CURRENT_DATE,
  project_location VARCHAR(255) NOT NULL,
  client_name VARCHAR(255),
  contractor_name VARCHAR(255),
  architect_consultant VARCHAR(255),
  contact_number VARCHAR(50),
  purpose_of_visit TEXT NOT NULL,
  product_of_interest VARCHAR(255),
  remarks TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_visit_reports_emp ON daily_visit_reports(employee_id);
CREATE INDEX IF NOT EXISTS idx_visit_reports_date ON daily_visit_reports(visit_date);
