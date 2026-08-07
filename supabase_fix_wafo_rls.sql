-- ====================================================================
-- PERBAIKAN RLS KHUSUS TABEL: wafo_announcements
-- Jalankan seluruh script ini di Supabase SQL Editor.
-- ====================================================================

-- 1. Buat / Perbarui helper function SECURITY DEFINER untuk mengecek Admin/Creator secara aman
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

-- 2. Pastikan Row Level Security (RLS) diaktifkan pada tabel wafo_announcements
ALTER TABLE public.wafo_announcements ENABLE ROW LEVEL SECURITY;

-- 3. Hapus semua policy lama pada wafo_announcements agar tidak ada konflik/duplikasi
DROP POLICY IF EXISTS "Publik dapat melihat informasi aktif" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat melihat semua informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat melihat semua informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat menambah informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat menambah informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat mengubah informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat mengubah informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dapat menghapus informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "Admin dan Creator dapat menghapus informasi" ON public.wafo_announcements;
DROP POLICY IF EXISTS "wafo_select_public" ON public.wafo_announcements;
DROP POLICY IF EXISTS "wafo_select_admin" ON public.wafo_announcements;
DROP POLICY IF EXISTS "wafo_insert_admin" ON public.wafo_announcements;
DROP POLICY IF EXISTS "wafo_update_admin" ON public.wafo_announcements;
DROP POLICY IF EXISTS "wafo_delete_admin" ON public.wafo_announcements;

-- 4. POLICY SELECT 1: Publik / Semua Pengguna dapat melihat pengumuman AKTIF (is_active = true)
CREATE POLICY "wafo_select_public"
ON public.wafo_announcements 
FOR SELECT
USING (is_active = true);

-- 5. POLICY SELECT 2: Admin & Creator dapat melihat SEMUA pengumuman (aktif maupun non-aktif)
CREATE POLICY "wafo_select_admin"
ON public.wafo_announcements 
FOR SELECT
TO authenticated
USING (public.is_admin_or_creator());

-- 6. POLICY INSERT: Hanya Admin & Creator yang dapat menambah pengumuman baru
CREATE POLICY "wafo_insert_admin"
ON public.wafo_announcements 
FOR INSERT
TO authenticated
WITH CHECK (public.is_admin_or_creator());

-- 7. POLICY UPDATE: Hanya Admin & Creator yang dapat mengubah pengumuman
CREATE POLICY "wafo_update_admin"
ON public.wafo_announcements 
FOR UPDATE
TO authenticated
USING (public.is_admin_or_creator())
WITH CHECK (public.is_admin_or_creator());

-- 8. POLICY DELETE: Hanya Admin & Creator yang dapat menghapus pengumuman
CREATE POLICY "wafo_delete_admin"
ON public.wafo_announcements 
FOR DELETE
TO authenticated
USING (public.is_admin_or_creator());
