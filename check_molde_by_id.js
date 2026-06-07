const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://fbdzbafzdmzcrteqhbto.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZiZHpiYWZ6ZG16Y3J0ZXFoYnRvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAzMzY2MDQsImV4cCI6MjA5NTkxMjYwNH0.uFvu7xoPCftFHsF8VMb2dvYsRb5o2G6LU2_B4QL1kTM';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  // Test if any known ID from the list has data in functional tables
  const ids = ['fd57c04c-fa81-4dda-bf4f-0001db3c0593', '056cebc4-6bad-4ac6-8b77-666d3fd0a26f'];
  for (const id of ids) {
    const { count } = await supabase.from('blocos_treino').select('*', { count: 'exact', head: true }).eq('user_id', id);
    console.log(`User ID ${id} has ${count} blocks.`);
  }
}
check();
