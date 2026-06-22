-- Jalankan script ini di SQL Editor Supabase untuk mengaktifkan Fitur Gelombang Voting

-- 1. Tabel Utama Gelombang Sesi
CREATE TABLE IF NOT EXISTS gelombang_voting (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nama_sesi TEXT NOT NULL,
  kelas JSONB NOT NULL, -- Contoh: ["GTK", "XII-1", "XII-2"]
  jam_mulai TEXT NOT NULL, -- Format '07:00' atau 'HH:MM'
  jam_selesai TEXT NOT NULL, -- Format '08:00' atau 'HH:MM'
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Tabel Global Config Status Gelombang
CREATE TABLE IF NOT EXISTS gelombang_config (
  id TEXT PRIMARY KEY DEFAULT 'default',
  is_active BOOLEAN DEFAULT false,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Kenakan RLS pada gelombang_voting
ALTER TABLE gelombang_voting ENABLE ROW LEVEL SECURITY;

-- Policy Read Seluruh Pengguna yang Terotentikasi (Siswa & Panitia)
DROP POLICY IF EXISTS "Allow authenticated read for gelombang_voting" ON gelombang_voting;
CREATE POLICY "Allow authenticated read for gelombang_voting" ON gelombang_voting
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy Admin CRUD Bebas
DROP POLICY IF EXISTS "Allow admin CRUD for gelombang_voting" ON gelombang_voting;
CREATE POLICY "Allow admin CRUD for gelombang_voting" ON gelombang_voting
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Kenakan RLS pada gelombang_config
ALTER TABLE gelombang_config ENABLE ROW LEVEL SECURITY;

-- Policy Read Seluruh Pengguna yang Terotentikasi
DROP POLICY IF EXISTS "Allow authenticated read for gelombang_config" ON gelombang_config;
CREATE POLICY "Allow authenticated read for gelombang_config" ON gelombang_config
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy Admin Update/Manage Config
DROP POLICY IF EXISTS "Allow admin CRUD for gelombang_config" ON gelombang_config;
CREATE POLICY "Allow admin CRUD for gelombang_config" ON gelombang_config
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND profiles.role = 'admin'
    )
  );

-- Buat Trigger untuk updated_at pada gelombang_voting
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON gelombang_voting;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON gelombang_voting
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Buat Trigger untuk updated_at pada gelombang_config
DROP TRIGGER IF EXISTS set_timestamp_config ON gelombang_config;
CREATE TRIGGER set_timestamp_config
BEFORE UPDATE ON gelombang_config
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();

-- Seed / Initial Record untuk Config
INSERT INTO gelombang_config (id, is_active) 
VALUES ('default', false) 
ON CONFLICT (id) DO NOTHING;
