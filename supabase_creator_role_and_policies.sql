-- ====================================================================
-- SCRIPT UNTUK MENGAKTIFKAN ROLE `creator` & MEMPERBARUI POLICIES DI SUPABASE
-- Jalankan seluruh script ini di SQL Editor Supabase Anda.
-- ====================================================================

-- 1. Tambahkan/ubah constraint role pada tabel profiles agar mendukung 'creator'
-- Jika sebelumnya ada CHECK constraint yang membatasi role, kita update/pastikan diizinkan.
-- Catatan: Jika ada constraint check yang membatasi role sebelumnya, silakan disesuaikan.
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('user', 'admin', 'creator'));

-- 2. UPDATE POLICY UNTUK TABEL: admin_button
DROP POLICY IF EXISTS "Allow admin to manage settings" ON admin_button;
CREATE POLICY "Allow admin and creator to manage settings" ON admin_button
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 3. UPDATE POLICIES UNTUK TABEL: countdown
DROP POLICY IF EXISTS "Admin dapat menambah countdown" ON countdown;
CREATE POLICY "Admin dan Creator dapat menambah countdown" ON countdown 
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

DROP POLICY IF EXISTS "Admin dapat mengubah countdown" ON countdown;
CREATE POLICY "Admin dan Creator dapat mengubah countdown" ON countdown 
FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

DROP POLICY IF EXISTS "Admin dapat menghapus countdown" ON countdown;
CREATE POLICY "Admin dan Creator dapat menghapus countdown" ON countdown 
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 4. UPDATE POLICIES UNTUK TABEL: gelombang_voting
DROP POLICY IF EXISTS "Allow admin CRUD for gelombang_voting" ON gelombang_voting;
CREATE POLICY "Allow admin and creator CRUD for gelombang_voting" ON gelombang_voting
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 5. UPDATE POLICIES UNTUK TABEL: gelombang_config
DROP POLICY IF EXISTS "Allow admin CRUD for gelombang_config" ON gelombang_config;
CREATE POLICY "Allow admin and creator CRUD for gelombang_config" ON gelombang_config
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 6. UPDATE POLICY UNTUK TABEL: landing_menu_button
DROP POLICY IF EXISTS "Admin memiliki akses penuh terhadap menu landing" ON landing_menu_button;
CREATE POLICY "Admin dan Creator memiliki akses penuh terhadap menu landing" ON landing_menu_button 
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 7. UPDATE POLICY UNTUK TABEL: landing_page_visibility
DROP POLICY IF EXISTS "Admin memiliki akses penuh terhadap visibilitas tombol" ON landing_page_visibility;
CREATE POLICY "Admin dan Creator memiliki akses penuh terhadap visibilitas tombol" ON landing_page_visibility 
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 8. UPDATE POLICIES UNTUK TABEL: candidates_mpk (dan MPK schema)
DROP POLICY IF EXISTS "Admin dapat menambah kandidat mpk" ON candidates_mpk;
CREATE POLICY "Admin dan Creator dapat menambah kandidat mpk" ON candidates_mpk 
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator'))
);

DROP POLICY IF EXISTS "Admin dapat mengubah kandidat mpk" ON candidates_mpk;
CREATE POLICY "Admin dan Creator dapat mengubah kandidat mpk" ON candidates_mpk 
FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator'))
);

DROP POLICY IF EXISTS "Admin dapat menghapus kandidat mpk" ON candidates_mpk;
CREATE POLICY "Admin dan Creator dapat menghapus kandidat mpk" ON candidates_mpk 
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator'))
);

-- 9. UPDATE POLICIES UNTUK TABEL: wafo_announcements
DROP POLICY IF EXISTS "Admin dapat melihat semua informasi" ON wafo_announcements;
CREATE POLICY "Admin dan Creator dapat melihat semua informasi" ON wafo_announcements 
FOR SELECT USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

DROP POLICY IF EXISTS "Admin dapat menambah informasi" ON wafo_announcements;
CREATE POLICY "Admin dan Creator dapat menambah informasi" ON wafo_announcements 
FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

DROP POLICY IF EXISTS "Admin dapat mengubah informasi" ON wafo_announcements;
CREATE POLICY "Admin dan Creator dapat mengubah informasi" ON wafo_announcements 
FOR UPDATE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

DROP POLICY IF EXISTS "Admin dapat menghapus informasi" ON wafo_announcements;
CREATE POLICY "Admin dan Creator dapat menghapus informasi" ON wafo_announcements 
FOR DELETE USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);

-- 10. UPDATE POLICY UNTUK AKSI DESTRUKTIF & PROFILES SECARA UMUM (BIAR CREATOR BISA MENGELOLA PROFILES)
-- Jika sebelumnya ada RLS Policy di tabel profiles yang hanya mengizinkan admin untuk CRUD profiles:
DROP POLICY IF EXISTS "Admin memiliki akses penuh terhadap profiles" ON profiles;
CREATE POLICY "Admin dan Creator memiliki akses penuh terhadap profiles" ON profiles
FOR ALL USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND (profiles.role = 'admin' OR profiles.role = 'creator')
  )
);
