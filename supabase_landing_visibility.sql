-- Buat tabel landing_page_visibility
CREATE TABLE landing_page_visibility (
  id TEXT PRIMARY KEY,
  is_visible BOOLEAN DEFAULT true NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE landing_page_visibility ENABLE ROW LEVEL SECURITY;

-- 1. Policy untuk Publik (Anon & Authenticated) agar bisa membaca status visibilitas tombol
CREATE POLICY "Publik dapat membaca visibilitas tombol"
ON landing_page_visibility 
FOR SELECT 
USING (true);

-- 2. Policy untuk Admin agar bisa melakukan semua operasi (INSERT, UPDATE, DELETE)
CREATE POLICY "Admin memiliki akses penuh terhadap visibilitas tombol" 
ON landing_page_visibility 
FOR ALL
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Seed Data Default untuk Tombol Landing Page
INSERT INTO landing_page_visibility (id, is_visible) VALUES
  ('bilik_suara', true),
  ('lihat_hasil', true),
  ('login', true),
  ('register', true),
  ('cara_menggunakan', true)
ON CONFLICT (id) DO UPDATE SET is_visible = EXCLUDED.is_visible;
