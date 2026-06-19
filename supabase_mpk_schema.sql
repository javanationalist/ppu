-- 1. Buat tabel candidates_mpk dengan dapil_id bertipe TEXT
CREATE TABLE candidates_mpk (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  dapil_id TEXT NOT NULL REFERENCES dapils(id) ON DELETE CASCADE,
  class_name TEXT NOT NULL,
  candidate_number INTEGER NOT NULL,
  candidate_name TEXT NOT NULL,
  photo_url TEXT,
  vision TEXT,
  mission TEXT[] DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 2. Aktifkan Row Level Security (RLS)
ALTER TABLE candidates_mpk ENABLE ROW LEVEL SECURITY;

-- 3. Policy untuk Publik (Agar pemilih bisa melihat kandidat MPK di kelasnya)
CREATE POLICY "Publik dapat melihat kandidat mpk" 
ON candidates_mpk 
FOR SELECT 
USING (true);

-- 4. Policy untuk Admin (Bisa membuat, mengubah, menghapus kandidat MPK)
CREATE POLICY "Admin dapat menambah kandidat mpk" 
ON candidates_mpk FOR INSERT 
WITH CHECK (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Admin dapat mengubah kandidat mpk" 
ON candidates_mpk FOR UPDATE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

CREATE POLICY "Admin dapat menghapus kandidat mpk" 
ON candidates_mpk FOR DELETE 
USING (
  auth.role() = 'authenticated' AND 
  EXISTS (SELECT 1 FROM profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- 5. Aktifkan Realtime untuk candidates_mpk
ALTER PUBLICATION supabase_realtime ADD TABLE candidates_mpk;
