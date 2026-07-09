-- =========================================================================
-- SQL MIGRATION: IMPLEMENTASI FITUR MODE BILIK SUARA (BOOTH VOTE MODE)
-- =========================================================================
-- Jalankan script ini di SQL Editor Supabase untuk mengaktifkan Fitur Mode Bilik Suara.
-- Script ini dirancang agar aman dijalankan karena menggunakan conditional check (IF NOT EXISTS)
-- dan tidak akan mengganggu atau merusak data yang sudah ada.

-- 1. MEMBUAT TABEL CONFIG VOTE MODE
-- Menyimpan pengaturan mode voting secara global (regular atau booth).
-- Seluruh halaman aplikasi akan mendeteksi status dari tabel ini secara realtime.
CREATE TABLE IF NOT EXISTS vote_mode (
  id TEXT PRIMARY KEY DEFAULT 'current',
  mode TEXT NOT NULL DEFAULT 'regular' CHECK (mode IN ('regular', 'booth')),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Seed awal data jika belum ada
INSERT INTO vote_mode (id, mode) 
VALUES ('current', 'regular') 
ON CONFLICT (id) DO NOTHING;

-- Aktifkan RLS (Row Level Security) untuk keamanan data
ALTER TABLE vote_mode ENABLE ROW LEVEL SECURITY;

-- Policy agar semua pengguna terotentikasi (Siswa, Bilik, & Panitia) dapat membaca status Mode Voting
DROP POLICY IF EXISTS "Allow authenticated read for vote_mode" ON vote_mode;
CREATE POLICY "Allow authenticated read for vote_mode" ON vote_mode
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy agar hanya akun dengan role 'admin' atau 'creator' yang dapat mengubah Mode Voting
DROP POLICY IF EXISTS "Allow admin and creator all for vote_mode" ON vote_mode;
CREATE POLICY "Allow admin and creator all for vote_mode" ON vote_mode
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


-- 2. MEMBUAT TABEL BOOTH SESSIONS (SESI BILIK SUARA)
-- Digunakan untuk mensinkronisasikan pemilih (voter) dengan bilik suara aktif via QR Code secara realtime.
CREATE TABLE IF NOT EXISTS booth_sessions (
  id TEXT PRIMARY KEY,
  status TEXT NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting', 'connected', 'completed', 'cancelled')),
  user_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  full_name TEXT,
  email TEXT,
  document_serial TEXT,
  card_id TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Aktifkan RLS untuk booth_sessions
ALTER TABLE booth_sessions ENABLE ROW LEVEL SECURITY;

-- Policy agar semua pengguna terotentikasi dapat membaca sesi aktif bilik
DROP POLICY IF EXISTS "Allow authenticated select for booth_sessions" ON booth_sessions;
CREATE POLICY "Allow authenticated select for booth_sessions" ON booth_sessions
  FOR SELECT USING (auth.role() = 'authenticated');

-- Policy agar semua pengguna terotentikasi dapat membuat sesi (khususnya device bilik role='vote')
DROP POLICY IF EXISTS "Allow authenticated insert for booth_sessions" ON booth_sessions;
CREATE POLICY "Allow authenticated insert for booth_sessions" ON booth_sessions
  FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Policy agar semua pengguna terotentikasi dapat memperbarui status sesi (voter menghubungkan diri atau bilik menyelesaikan/membatalkan sesi)
DROP POLICY IF EXISTS "Allow authenticated update for booth_sessions" ON booth_sessions;
CREATE POLICY "Allow authenticated update for booth_sessions" ON booth_sessions
  FOR UPDATE USING (auth.role() = 'authenticated') WITH CHECK (auth.role() = 'authenticated');

-- Policy agar hanya admin atau creator yang dapat menghapus data sesi historis jika diperlukan
DROP POLICY IF EXISTS "Allow admin and creator delete for booth_sessions" ON booth_sessions;
CREATE POLICY "Allow admin and creator delete for booth_sessions" ON booth_sessions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles 
      WHERE profiles.id = auth.uid() 
      AND (profiles.role = 'admin' OR profiles.role = 'creator')
    )
  );


-- 3. VALIDASI & MODIFIKASI TABEL PROFILES
-- Memastikan kolom voting_status dan is_deleted ada pada tabel profiles untuk mendukung siklus hidup bilik suara.
DO $$
BEGIN
  -- Tambahkan kolom is_deleted ke tabel profiles jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='is_deleted') THEN
    ALTER TABLE profiles ADD COLUMN is_deleted BOOLEAN DEFAULT false;
  END IF;

  -- Tambahkan kolom voting_status ke tabel profiles jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='voting_status') THEN
    ALTER TABLE profiles ADD COLUMN voting_status TEXT DEFAULT 'offline';
  END IF;
END $$;


-- 4. AKTIFKAN REALTIME SINKRONISASI
-- Sangat krusial agar perubahan status vote_mode dan booth_sessions terupdate secara instan ke browser tanpa refresh.
DO $$
BEGIN
  -- Tambahkan tabel ke publikasi realtime jika publikasi tersebut ada dan tabel belum terdaftar
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'vote_mode'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE vote_mode';
    END IF;

    IF NOT EXISTS (
      SELECT 1 FROM pg_publication_tables 
      WHERE pubname = 'supabase_realtime' AND tablename = 'booth_sessions'
    ) THEN
      EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE booth_sessions';
    END IF;
  END IF;
END $$;
