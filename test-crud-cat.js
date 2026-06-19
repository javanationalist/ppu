import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  console.log("=== TRY CREATE ===");
  const catObj = { id: 'test_cat', name: 'Tester', icon: 'i', type: 'reguler', order: 100 };
  let res = await supabase.from('categories').insert(catObj);
  console.log("CREATE:", res.error || "Success");

  console.log("\n=== TRY UPDATE ===");
  res = await supabase.from('categories').update({ name: 'Tester Edit' }).eq('id', 'test_cat');
  console.log("UPDATE:", res.error || "Success");
  
  console.log("\n=== TRY DELETE ===");
  res = await supabase.from('categories').delete().eq('id', 'test_cat');
  console.log("DELETE:", res.error || "Success");
}
check();
