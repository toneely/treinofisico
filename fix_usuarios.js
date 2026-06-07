const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fbdzbafzdmzcrteqhbto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZHpiYWZ6ZG16Y3J0ZXFoYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzY2MDQsImV4cCI6MjA5NTkxMjYwNH0.uFvu7xoPCftFHsF8VMb2dvYsRb5o2G6LU2_B4QL1kTM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function fix() {
  const { data, error } = await supabase.from('usuarios').select('id, nome').eq('nome', 'Tone Ely').limit(1);
  if (data && data.length > 0) {
    const moldeId = data[0].id;
    console.log('Found user Tone Ely with ID:', moldeId);
    // Note: I cannot add the column here due to restricted local environment.
    // But I will update the code to use this known ID or fallback.
  }
}
fix();
