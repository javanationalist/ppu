import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

if (!url || !key) {
  console.log("No Supabase URL or Key found in env.");
  process.exit(1);
}

const supabase = createClient(url, key);

async function run() {
  const testVoterId = crypto.randomUUID();
  console.log("Testing insert with non-existent voter_id:", testVoterId);
  const { data, error } = await supabase.from('votes').insert({
    voter_id: testVoterId,
    category_id: 'osis',
    candidate_id: 'osis1'
  }).select();
  
  if (error) {
    console.log("Insert failed. Error code:", error.code, "Message:", error.message);
  } else {
    console.log("Insert succeeded!", data);
    // clean up if it succeeded
    await supabase.from('votes').delete().eq('voter_id', testVoterId);
  }
}

run();
