-- =========================================================================
-- SQL MIGRATION: MENAMBAHKAN KOLOM BOOTH_CODE UNTUK FORMAT TOKEN PPU-CC-XXXX
-- =========================================================================
-- Jalankan script ini di SQL Editor Supabase untuk mendukung kode bilik tetap (booth_code).
-- Script ini dirancang agar aman dijalankan karena menggunakan conditional check (IF NOT EXISTS)
-- dan tidak akan merusak data yang sudah ada.

-- 1. MENAMBAHKAN KOLOM booth_code KE TABEL profiles
-- Menambahkan kolom booth_code bertipe TEXT ke tabel profiles secara aman.
-- Kolom ini akan menyimpan Kode Bilik (CC) unik untuk masing-masing akun Bilik Suara.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='booth_code') THEN
    ALTER TABLE profiles ADD COLUMN booth_code TEXT;
  END IF;
END $$;


-- 2. MIGRASI DATA / SEED AWAL AKUN BILIK SUARA YANG SUDAH ADA
-- Agar akun bilik suara yang sudah terdaftar tidak bernilai NULL untuk kode biliknya,
-- kita lakukan migrasi otomatis mengambil angka numerik dari nama bilik (contoh: "Bilik 01" menjadi "01").
UPDATE profiles 
SET booth_code = LPAD(SUBSTRING(REGEXP_REPLACE(full_name, '[^0-9]', '', 'g') FROM 1 FOR 2), 2, '0')
WHERE role = 'vote' AND (booth_code IS NULL OR booth_code = '');

-- Sebagai fallback jika nama bilik tidak memiliki angka, buatkan kode urut otomatis berdasarkan tanggal dibuat (created_at)
WITH ranked_booths AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY created_at ASC) as row_num
  FROM profiles
  WHERE role = 'vote' AND (booth_code IS NULL OR booth_code = '' OR booth_code = '00')
)
UPDATE profiles p
SET booth_code = LPAD(r.row_num::text, 2, '0')
FROM ranked_booths r
WHERE p.id = r.id;


-- 3. MEMBUAT INDEX UNTUK OPTIMASI PENALARAN DAN INTEGRITAS DATA
-- Membuat partial index pada kolom booth_code untuk mempercepat pencarian data bilik suara yang aktif.
-- Ini juga memastikan query filter `role = 'vote'` dan `is_deleted = false` berjalan sangat cepat.
CREATE INDEX IF NOT EXISTS idx_profiles_booth_code ON profiles(booth_code) 
WHERE (role = 'vote' AND is_deleted = false);
