-- Tambahkan kolom card_visibility ke tabel profiles
ALTER TABLE profiles
ADD COLUMN IF NOT EXISTS card_visibility BOOLEAN NOT NULL DEFAULT true;

-- Pastikan data lama otomatis memiliki nilai default true jika ada yang NULL (meskipun DEFAULT true sudah mengurusnya)
UPDATE profiles
SET card_visibility = true
WHERE card_visibility IS NULL;
