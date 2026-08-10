import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL;
const key = process.env.VITE_SUPABASE_ANON_KEY;

const supabase = createClient(url, key);

async function run() {
  console.log("Checking pg_policies...");
  const { data, error } = await supabase.rpc('query_policies_custom');
  if (error) {
    // If the rpc doesn't exist, we can try running a query through standard means or check pg_policies via a generic query.
    // Wait, let's see if we can do a select on pg_policies using supabase.rpc or other means.
    console.log("RPC query_policies_custom error:", error);
    
    // Let's see if we have some other ways.
    // Actually, let's query the profiles table or try inserting as authenticated.
  } else {
    console.log("Policies:", data);
  }
}

run();
