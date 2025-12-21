import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY

// Check if environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('⚠️ Missing Supabase environment variables. Please create a .env file with:')
  console.warn('VITE_SUPABASE_URL=https://umldjcyvmtjtjyyhspif.supabase.co')
  console.warn('VITE_SUPABASE_PUBLISHABLE_DEFAULT_KEY=sb_publishable_-pTAB3wbjcbHlVCmzYjKlg_KHN4VyqW')
  console.warn('App will continue with dummy data until .env file is created.')
}

// Create client with fallback values (will fail gracefully if env vars missing)
export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

// Export a helper to check if Supabase is configured
export const isSupabaseConfigured = () => {
  return !!(supabaseUrl && supabaseAnonKey && supabase)
}

