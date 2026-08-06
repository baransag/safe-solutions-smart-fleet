CREATE TABLE hero_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title VARCHAR(255) NOT NULL,
  description TEXT,
  rich_text TEXT,
  media_url VARCHAR(255),
  media_type VARCHAR(50) DEFAULT 'none', -- image, video, pdf, none
  priority VARCHAR(20) DEFAULT 'normal', -- high, normal, low
  status VARCHAR(20) DEFAULT 'published', -- published, draft, archived
  start_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP,
  created_by INTEGER REFERENCES employees(id),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
