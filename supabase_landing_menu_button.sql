-- Buat tabel landing_menu_button
CREATE TABLE IF NOT EXISTS landing_menu_button (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  is_visible BOOLEAN DEFAULT true NOT NULL,
  display_order INTEGER DEFAULT 0 NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE landing_menu_button ENABLE ROW LEVEL SECURITY;

-- 1. Policy untuk Publik (Anon & Authenticated) agar bisa membaca menu
CREATE POLICY "Semua orang dapat membaca menu landing" 
ON landing_menu_button 
FOR SELECT 
USING (true);

-- 2. Policy untuk Admin (Akses penuh)
CREATE POLICY "Admin memiliki akses penuh terhadap menu landing" 
ON landing_menu_button 
FOR ALL
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Masukkan data awal untuk menu header di landing page
INSERT INTO landing_menu_button (id, name, path, is_visible, display_order) VALUES
  ('beranda', 'Beranda', '/', true, 1),
  ('informasi', 'Informasi', '/informasi', true, 2),
  ('tentang', 'Tentang', '/tentang', true, 3),
  ('cara_menggunakan', 'Cara Menggunakan', '/cara-menggunakan', true, 4),
  ('login', 'Login', '/login', true, 5),
  ('signup', 'Sign Up', '/signup', true, 6)
ON CONFLICT (id) DO UPDATE SET 
  name = EXCLUDED.name,
  path = EXCLUDED.path,
  is_visible = EXCLUDED.is_visible,
  display_order = EXCLUDED.display_order;
