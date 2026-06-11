import { createClient } from "@supabase/supabase-js";

// Using environment variables with hardcoded fallbacks to ensure it works on Netlify
const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  "https://fbdzbafzdmzcrteqhbto.supabase.co";
const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZHpiYWZ6ZG16Y3J0ZXFoYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzY2MDQsImV4cCI6MjA5NTkxMjYwNH0.uFvu7xoPCftFHsF8VMb2dvYsRb5o2G6LU2_B4QL1kTM";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
