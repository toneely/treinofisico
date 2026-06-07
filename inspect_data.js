const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fbdzbafzdmzcrteqhbto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZHpiYWZ6ZG16Y3J0ZXFoYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzY2MDQsImV4cCI6MjA5NTkxMjYwNH0.uFvu7xoPCftFHsF8VMb2dvYsRb5o2G6LU2_B4QL1kTM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspect() {
  const { data, error } = await supabase.from('exercicios_padrao').select('*').limit(1);
  if (data && data.length > 0) {
    console.log('Sample data:', JSON.stringify(data[0], null, 2));
  } else {
    console.log('No data or error:', error?.message);
  }
}
inspect();
