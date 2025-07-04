import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('SUPABASE_URL e SUPABASE_KEY são necessários');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUsersTable() {
  console.log('Verificando estrutura da tabela users...\n');
  
  try {
    // Buscar um registro para ver a estrutura
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .limit(1);
    
    if (error) {
      console.log(`❌ Erro ao acessar tabela users: ${error.message}`);
      return;
    }
    
    if (data && data.length > 0) {
      console.log('✅ Estrutura atual da tabela users:');
      const fields = Object.keys(data[0]);
      fields.forEach(field => {
        const value = data[0][field];
        const type = typeof value;
        console.log(`  - ${field}: ${type} ${value !== null ? `(valor: ${value})` : '(null)'}`);
      });
      
      // Verificar se tem campo password
      if (fields.includes('password')) {
        console.log('\n✅ Campo "password" encontrado na tabela!');
      } else {
        console.log('\n❌ Campo "password" NÃO encontrado na tabela');
      }
      
      // Verificar se tem campo role 
      if (fields.includes('role')) {
        console.log('✅ Campo "role" encontrado na tabela!');
      } else {
        console.log('❌ Campo "role" NÃO encontrado na tabela');
      }
      
    } else {
      console.log('✅ Tabela users existe mas está vazia');
    }
    
    // Contar total de registros
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true });
    
    console.log(`\n📊 Total de registros na tabela users: ${count}`);
    
  } catch (err) {
    console.log(`❌ Erro: ${err.message}`);
  }
}

checkUsersTable();