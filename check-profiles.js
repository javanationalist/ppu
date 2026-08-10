import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log("Fetching profiles limit 1...");
  const { data, error } = await supabase.from('profiles').select('*').limit(1);
  if (error) {
    console.log("Error fetching profiles:", error);
  } else {
    console.log("Profile sample:", data);
  }
}

run();
