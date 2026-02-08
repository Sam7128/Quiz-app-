import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Validation helper
export const isCloudEnabled = (): boolean => {
  return !!(supabaseUrl && supabaseAnonKey && supabaseUrl !== '' && supabaseAnonKey !== '');
};

if (!isCloudEnabled()) {
  console.warn('Supabase configuration is incomplete. Cloud features (sync, social) will be unavailable.');
}

// Ensure the client is always created but with valid-looking strings to prevent internal SDK crashes
// if the user hasn't set up .env yet.
export const supabase = createClient(
  supabaseUrl || 'https://placeholder-project.supabase.co', 
  supabaseAnonKey || 'placeholder-key'
);
