-- Buat tabel wafo_announcements
CREATE TABLE wafo_announcements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE wafo_announcements ENABLE ROW LEVEL SECURITY;

-- 1. Policy untuk Publik (Agar bisa dibaca oleh semua orang di Landing Page asalkan aktif)
CREATE POLICY "Publik dapat melihat informasi aktif" 
ON wafo_announcements 
FOR SELECT 
USING (is_active = true);

-- 2. Policy untuk Admin (Bisa melihat seluruh informasi termasuk yang nonaktif)
CREATE POLICY "Admin dapat melihat semua informasi" 
ON wafo_announcements 
FOR SELECT 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. Policy untuk Admin (Bisa membuat informasi baru)
CREATE POLICY "Admin dapat menambah informasi" 
ON wafo_announcements 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. Policy untuk Admin (Bisa mengupdate informasi)
CREATE POLICY "Admin dapat mengubah informasi" 
ON wafo_announcements 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 5. Policy untuk Admin (Bisa menghapus informasi)
CREATE POLICY "Admin dapat menghapus informasi" 
ON wafo_announcements 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Aktifkan Supabase Realtime untuk tabel wafo_announcements
-- (pastikan replica identity 'default' atau 'full' tergantung kebutuhan, default sudah cukup)
ALTER PUBLICATION supabase_realtime ADD TABLE wafo_announcements;
