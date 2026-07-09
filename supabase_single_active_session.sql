-- =========================================================================
-- SQL MIGRATION: IMPLEMENTASI SINGLE ACTIVE SESSION
-- =========================================================================
-- Jalankan script ini di SQL Editor Supabase untuk mengaktifkan proteksi Single Active Session.
-- Script ini dirancang agar aman dijalankan karena menggunakan conditional check (IF NOT EXISTS)
-- dan tidak akan mengganggu atau merusak data yang sudah ada.

DO $$
BEGIN
  -- 1. Menambahkan kolom last_seen ke tabel profiles jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='last_seen') THEN
    ALTER TABLE profiles ADD COLUMN last_seen TIMESTAMPTZ DEFAULT NULL;
  END IF;

  -- 2. Menambahkan kolom session_token ke tabel profiles jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='session_token') THEN
    ALTER TABLE profiles ADD COLUMN session_token TEXT DEFAULT NULL;
  END IF;

  -- 3. Menambahkan kolom device_name ke tabel profiles jika belum ada
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='device_name') THEN
    ALTER TABLE profiles ADD COLUMN device_name TEXT DEFAULT NULL;
  END IF;
END $$;

-- 4. Buat index untuk mempercepat pencarian session_token dan optimalisasi query status
CREATE INDEX IF NOT EXISTS idx_profiles_session_token ON profiles(session_token);
