import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function check() {
  const { data: cat1, error: e1 } = await supabase.from('categories').insert({ id: 'test3', name: 't3', icon: 'i3', type: 'reguler' });
  console.log("cat1 error (reguler)", e1);
  
  const { data: cat2, error: e2 } = await supabase.from('categories').insert({ id: 'test4', name: 't4', icon: 'i4', type: 'normal' });
  console.log("cat2 error (normal)", e2);

  const { data: cat3, error: e3 } = await supabase.from('categories').insert({ id: 'test5', name: 't5', icon: 'i5', type: 'mpk_smaba' });
  console.log("cat3 error (mpk_smaba)", e3);
  
  const { data: cat4, error: e4 } = await supabase.from('categories').insert({ id: 'test6', name: 't6', icon: 'i6', type: 'mpk' });
  console.log("cat4 error (mpk)", e4);
}
check();
