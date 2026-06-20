-- Jalankan script ini di SQL Editor Supabase untuk mengaktifkan fitur On/Off Menu Admin

CREATE TABLE IF NOT EXISTS admin_button (
  id TEXT PRIMARY KEY DEFAULT 'default',
  kelola_kategori BOOLEAN DEFAULT true,
  kelola_kandidat BOOLEAN DEFAULT true,
  konfirmasi_pemilih BOOLEAN DEFAULT true,
  kelola_pemilih BOOLEAN DEFAULT true,
  wafo BOOLEAN DEFAULT true,
  kelola_helpdesk BOOLEAN DEFAULT true,
  visibilitas_user BOOLEAN DEFAULT true,
  hasil_voting BOOLEAN DEFAULT true,
  audit_log BOOLEAN DEFAULT true,
  export_data BOOLEAN DEFAULT true,
  maintenance BOOLEAN DEFAULT true,
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Aktifkan RLS
ALTER TABLE admin_button ENABLE ROW LEVEL SECURITY;

-- Policy Read
DROP POLICY IF EXISTS "Allow authenticated read access" ON admin_button;
CREATE POLICY "Allow authenticated read access" ON admin_button
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy Manage (Admin Only)
DROP POLICY IF EXISTS "Allow admin to manage settings" ON admin_button;
CREATE POLICY "Allow admin to manage settings" ON admin_button
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

-- Initial Record
INSERT INTO admin_button (id) 
VALUES ('default') 
ON CONFLICT (id) DO NOTHING;
