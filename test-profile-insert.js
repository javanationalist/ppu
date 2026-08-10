import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  const testId = crypto.randomUUID();
  console.log("Testing insert into profiles with id:", testId);
  const { data, error } = await supabase.from('profiles').insert({
    id: testId,
    full_name: 'Anonym PPU FreeVote',
    email: `freevote-${testId}@example.com`,
    class: 'FREE_VOTE',
    card_id: `FV-${Math.floor(1000 + Math.random() * 9000)}`,
    role: 'user',
    account_status: 'dikonfirmasi', // to allow voting
    voting_status: 'belum'
  }).select();

  if (error) {
    console.log("Profile insert failed. Error code:", error.code, "Message:", error.message);
  } else {
    console.log("Profile insert succeeded!", data);
    // clean up
    await supabase.from('profiles').delete().eq('id', testId);
  }
}

run();
