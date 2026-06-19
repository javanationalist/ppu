import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const candMpk = await supabase.from('candidates_mpk').upsert({ id: '123e4567-e89b-12d3-a456-426614174000', dapil_id: 'dapil-1781793145522', class_name: 'X-1', candidate_number: 1, candidate_name: 'A', photo_url: '', vision: 'v', mission: ['Misi 1', 'Misi 2'] });
  console.log("candMpk upsert error:", candMpk.error);
}
check();
