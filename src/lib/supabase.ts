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

const supabaseUrl = getEnvVar('VITE_SUPABASE_URL') || 'https://placeholder.supabase.co';
const supabaseAnonKey = getEnvVar('VITE_SUPABASE_ANON_KEY') || 'placeholder-key';

export const isSupabaseConfigured = 
  supabaseUrl !== 'https://placeholder.supabase.co' && 
  supabaseUrl.trim() !== '' &&
  supabaseAnonKey !== 'placeholder-key' && 
  supabaseAnonKey.trim() !== '';

export const realSupabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabase = isSupabaseConfigured ? realSupabase : (mockSupabase as any);
