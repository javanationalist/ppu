import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function checkPolicies() {
  console.log("=== CHECKING POLICIES ===");
  const { data, error } = await supabase.rpc('get_policies_summary');
  if (error) {
    // If the rpc doesn't exist, let's try a direct query or check what we can find.
    console.log("get_policies_summary RPC error/not found:", error);
    
    // Let's run a query to information_schema or check constraint if possible
    console.log("Attempting direct policy query...");
    const { data: pData, error: pError } = await supabase
      .from('pg_policies')
      .select('*');
    console.log("pg_policies query result:", pData, pError);
  } else {
    console.log("Policies:", data);
  }
}

checkPolicies();
