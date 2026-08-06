-- Migration 007: Update employees role check constraint
ALTER TABLE employees DROP CONSTRAINT IF EXISTS employees_role_check;
ALTER TABLE employees ADD CONSTRAINT employees_role_check CHECK (role IN ('admin', 'boss', 'controller', 'manager', 'employee'));
