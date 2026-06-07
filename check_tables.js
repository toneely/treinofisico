const supabase = require('./supabaseClient');

async function check() {
  const { data, error } = await supabase.from('exercicios_padrao').select('*').limit(1);
  if (error) {
    console.log('exercicios_padrao error:', error.message);
  } else {
    console.log('exercicios_padrao exists');
  }
}
check();
