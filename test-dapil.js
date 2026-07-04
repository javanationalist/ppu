import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import crypto from 'crypto';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function testDapil() {
  const testId = 'dapil-test-' + Date.now();
  
  console.log("=== TESTING INSERT DAPIL ===");
  const payload = {
    id: testId,
    category_id: 'mpk',
    name: 'Test Dapil',
    eligible_classes: ['X-1'],
    photo_url: '',
    order: 5
  };
  
  const resInsert = await supabase.from('dapils').insert(payload);
  console.log("Insert result error:", resInsert.error);
  
  console.log("=== TESTING UPDATE DAPIL ===");
  const resUpdate = await supabase.from('dapils').update({ name: 'Test Dapil Edited' }).eq('id', testId);
  console.log("Update result error:", resUpdate.error);
  
  console.log("=== TESTING DELETE DAPIL ===");
  const resDelete = await supabase.from('dapils').delete().eq('id', testId);
  console.log("Delete result error:", resDelete.error);
}

testDapil();
