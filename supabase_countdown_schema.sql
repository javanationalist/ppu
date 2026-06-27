-- Buat tabel countdown
CREATE TABLE IF NOT EXISTS countdown (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  title TEXT NOT NULL,
  target_datetime TIMESTAMP WITH TIME ZONE NOT NULL,
  finished_text TEXT NOT NULL,
  is_active BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Aktifkan Row Level Security (RLS)
ALTER TABLE countdown ENABLE ROW LEVEL SECURITY;

-- 1. Policy untuk Publik (Agar bisa dibaca oleh semua orang di Landing Page)
CREATE POLICY "Semua orang dapat membaca countdown" 
ON countdown 
FOR SELECT 
USING (true);

-- 2. Policy untuk Admin (Dapat menambah data)
CREATE POLICY "Admin dapat menambah countdown" 
ON countdown 
FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 3. Policy untuk Admin (Dapat mengubah data)
CREATE POLICY "Admin dapat mengubah countdown" 
ON countdown 
FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- 4. Policy untuk Admin (Dapat menghapus data)
CREATE POLICY "Admin dapat menghapus countdown" 
ON countdown 
FOR DELETE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (
    SELECT 1 FROM profiles 
    WHERE profiles.id = auth.uid() AND profiles.role = 'admin'
  )
);

-- Aktifkan Supabase Realtime untuk tabel countdown
ALTER PUBLICATION supabase_realtime ADD TABLE countdown;
