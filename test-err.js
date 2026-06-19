import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data, error } = await supabase.from('categories').insert({ id: 'test2', name: 't2', icon: 'i2', type: 'reguler', order: 1 });
  console.log(error);
}
check();
