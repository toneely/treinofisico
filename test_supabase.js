const supabase = require('./supabaseClient');

async function testConnection() {
  const { data, error } = await supabase.from('_test_connection').select('*').limit(1);

  if (error) {
    if (error.code === 'PGRST116' || error.message.includes('relation "_test_connection" does not exist') || error.message.includes('Could not find the table')) {
        console.log('Conexão com Supabase estabelecida com sucesso! (A tabela não existe, mas a conexão foi feita)');
    } else {
        console.error('Erro ao conectar ao Supabase:', error.message);
        process.exit(1);
    }
  } else {
    console.log('Conexão com Supabase estabelecida com sucesso!');
  }
}

testConnection();