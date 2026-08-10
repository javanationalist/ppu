-- Jalankan script ini di SQL Editor Supabase untuk mengaktifkan/memperbarui fitur On/Off Menu Admin
-- JIKA TABEL SUDAH ADA, JALANKAN PERINTAH ALTER BERIKUT LANGSUNG:
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS gelombang_voting BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS mode_vote BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS kelola_kategori BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS kelola_kandidat BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS konfirmasi_pemilih BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS kelola_pemilih BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS kelola_admin BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS kelola_bilik BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS wafo BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS countdown BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS kelola_helpdesk BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS visibilitas_user BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS hasil_voting BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS audit_log BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS export_data BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS maintenance BOOLEAN DEFAULT true;
ALTER TABLE admin_button ADD COLUMN IF NOT EXISTS system_update BOOLEAN DEFAULT true;

CREATE TABLE IF NOT EXISTS admin_button (
  id TEXT PRIMARY KEY DEFAULT 'default',
  gelombang_voting BOOLEAN DEFAULT true,
  mode_vote BOOLEAN DEFAULT true,
  kelola_kategori BOOLEAN DEFAULT true,
  kelola_kandidat BOOLEAN DEFAULT true,
  konfirmasi_pemilih BOOLEAN DEFAULT true,
  kelola_pemilih BOOLEAN DEFAULT true,
  kelola_admin BOOLEAN DEFAULT true,
  kelola_bilik BOOLEAN DEFAULT true,
  wafo BOOLEAN DEFAULT true,
  countdown BOOLEAN DEFAULT true,
  kelola_helpdesk BOOLEAN DEFAULT true,
  visibilitas_user BOOLEAN DEFAULT true,
  hasil_voting BOOLEAN DEFAULT true,
  audit_log BOOLEAN DEFAULT true,
  export_data BOOLEAN DEFAULT true,
  maintenance BOOLEAN DEFAULT true,
  system_update BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Aktifkan RLS
ALTER TABLE admin_button ENABLE ROW LEVEL SECURITY;

-- Policy Read
DROP POLICY IF EXISTS "Allow authenticated read access" ON admin_button;
CREATE POLICY "Allow authenticated read access" ON admin_button
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy Manage (Admin & Creator)
DROP POLICY IF EXISTS "Allow admin to manage settings" ON admin_button;
DROP POLICY IF EXISTS "Allow admin and creator to manage settings" ON admin_button;
CREATE POLICY "Allow admin and creator to manage settings" ON admin_button
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
    )
  );

-- Initial Record
INSERT INTO admin_button (id) 
VALUES ('default') 
ON CONFLICT (id) DO NOTHING;

