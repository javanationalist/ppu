-- Buat tabel wafo_announcements
CREATE TABLE IF NOT EXISTS wafo_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE wafo_announcements ENABLE ROW LEVEL SECURITY;

-- Helper function SECURITY DEFINER untuk mengecek Admin/Creator
CREATE OR REPLACE FUNCTION public.is_admin_or_creator()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND role IN ('admin', 'creator')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Hapus policy lama jika ada
DROP POLICY IF EXISTS "Publik dapat melihat informasi aktif" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat melihat semua informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat melihat semua informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat menambah informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat menambah informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat mengubah informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat mengubah informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat menghapus informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat menghapus informasi" ON wafo_announcements;
DROP POLICY IF EXISTS "wafo_select_public" ON wafo_announcements;
DROP POLICY IF EXISTS "wafo_select_admin" ON wafo_announcements;
DROP POLICY IF EXISTS "wafo_insert_admin" ON wafo_announcements;
DROP POLICY IF EXISTS "wafo_update_admin" ON wafo_announcements;
DROP POLICY IF EXISTS "wafo_delete_admin" ON wafo_announcements;

-- 1. Policy untuk Publik (Dapat melihat pengumuman aktif)
CREATE POLICY "wafo_select_public"
ON wafo_announcements 
FOR SELECT
USING (is_active = true);

-- 2. Policy untuk Admin & Creator (Dapat melihat seluruh pengumuman)
CREATE POLICY "wafo_select_admin"
ON wafo_announcements 
FOR SELECT
TO authenticated
USING (public.is_admin_or_creator());

-- 3. Policy untuk Admin & Creator (Dapat membuat pengumuman baru)
CREATE POLICY "wafo_insert_admin"
ON wafo_announcements 
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_creator());

-- 4. Policy untuk Admin & Creator (Dapat mengubah pengumuman)
CREATE POLICY "wafo_update_admin"
ON wafo_announcements 
FOR UPDATE
TO authenticated
USING (public.is_admin_or_creator())
WITH CHECK (public.is_admin_or_creator());

-- 5. Policy untuk Admin & Creator (Dapat menghapus pengumuman)
CREATE POLICY "wafo_delete_admin"
ON wafo_announcements 
FOR DELETE
TO authenticated
USING (public.is_admin_or_creator());

-- Aktifkan Supabase Realtime untuk tabel wafo_announcements
ALTER PUBLICATION supabase_realtime ADD TABLE wafo_announcements;
