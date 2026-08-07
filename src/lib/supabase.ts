/// <reference types="vite/client" />
import { createClient } from '@supabase/supabase-js';
import { mockSupabase } from './mockSupabase';

const getEnvVar = (key: string): string => {
  try {
    if (typeof import.meta !== 'undefined' && import.meta.env) {
      return (import.meta.env as any)[key] || '';
    }
  } catch (e) {}
  
  try {
    if (typeof process !== 'undefined' && process.env) {
      return (process.env as any)[key] || '';
    }
  } catch (e) {}
  
  return '';
};

const supabaseUrlRaw = getEnvVar('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'placeholder-key';

// Helper to check if URL is structurally valid
const getSafeSupabaseUrl = (url: string): string => {
  try {
    new URL(url);
    return url;
  } catch (e) {
    return 'https://placeholder.supabase.co';
  }
};

const supabaseUrl = getSafeSupabaseUrl(supabaseUrlRaw);

const isPlaceholder = (val: string): boolean => {
  const lower = val.toLowerCase();
  return (
    lower.includes('placeholder') ||
    lower.includes('your-project') ||
    lower.includes('your_') ||
    lower.includes('your-anon') ||
    lower.includes('xyzcompany') ||
    lower.includes('example.supabase') ||
    lower.includes('example.com') ||
    val.trim() === ''
  );
};

export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  !isPlaceholder(supabaseUrl) &&
  supabaseAnonKey !== 'placeholder-key' && 
  !isPlaceholder(supabaseAnonKey);

let initializedRealSupabase: any = null;
try {
  initializedRealSupabase = createClient(supabaseUrl, supabaseAnonKey);
} catch (err) {
  console.warn("Failed to initialize real Supabase client:", err);
  initializedRealSupabase = {} as any;
}

export const realSupabase = initializedRealSupabase;

// Source of Truth: When Supabase is configured, ALWAYS use realSupabase directly.
// Never automatically toggle or transition to mock storage on request error.
export const supabase = isSupabaseConfigured ? realSupabase : mockSupabase;


