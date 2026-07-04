import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("=== TRY CREATE ===");
  const catObj = { id: 'test_cat', name: 'Tester', icon: 'i', type: 'regular' };
  let res = await supabase.from('categories').insert(catObj).select();
  console.log("CREATE:", res.error || res.data);

  console.log("\n=== TRY UPDATE ===");
  res = await supabase.from('categories').update({ name: 'Tester Edit' }).eq('id', 'test_cat').select();
  console.log("UPDATE:", res.error || res.data);
  
  console.log("\n=== TRY DELETE ===");
  res = await supabase.from('categories').delete().eq('id', 'test_cat').select();
  console.log("DELETE:", res.error || res.data);
}
check();
