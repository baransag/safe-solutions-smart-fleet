-- Migration 005: Add selfie and site photo to attendance records
ALTER TABLE attendance_records
  ADD COLUMN IF NOT EXISTS selfie_url VARCHAR(500),
  ADD COLUMN IF NOT EXISTS site_photo_url VARCHAR(500);
