import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();
const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);
async function check() {
  const { data: cand, error: e3 } = await supabase.from('candidates').select('*').limit(1);
  console.log("cand columns", cand && cand[0] ? Object.keys(cand[0]) : "no rows");
  console.log("cand error", e3);

  const { data: cat, error: e1 } = await supabase.from('categories').select('*').limit(2);
  console.log("cat columns", cat && cat[0] ? Object.keys(cat[0]) : "no rows");
  console.log("cat values", cat);
  console.log("cat error", e1);

  const { data: dapil, error: e4 } = await supabase.from('dapils').select('*').limit(2);
  console.log("dapil columns", dapil && dapil[0] ? Object.keys(dapil[0]) : "no rows");
  console.log("dapil values", dapil);
  console.log("dapil error", e4);
}
check();
