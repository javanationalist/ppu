import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.rpc('get_schema_info'); // likely fails
  console.log("fallback...");
  
  // just try to insert a regular candidate and catch the column error if any
  const res = await supabase.from('candidates').insert({
    id: crypto.randomUUID(),
    category_id: 'tes',
    number: 1,
    chairman: 'a',
    vice: 'b',
    photo_url: 'c',
    visi: 'd',
    misi: ['e']
  });
  console.log("cand reguler:", res.error);
}
check();
