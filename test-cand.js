import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const cand = await supabase.from('candidates').upsert({ id: '123e4567-e89b-12d3-a456-426614174000', category_id: 'osis', number: 1, chairman: 'A', vice: 'B', photo_url: '', visi: 'v', misi: ['Misi 1', 'Misi 2'] });
  console.log("cand upsert error:", cand.error);
}
check();
