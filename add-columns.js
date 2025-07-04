// Script para adicionar colunas na tabela professional_availability
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Variáveis de ambiente não encontradas');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function addColumns() {
  console.log('🔧 ADICIONANDO COLUNAS NA TABELA PROFESSIONAL_AVAILABILITY...\n');

  const columnsToAdd = [
    {
      name: 'service_id',
      sql: 'ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS service_id UUID REFERENCES services(id);'
    },
    {
      name: 'custom_price',
      sql: 'ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS custom_price INTEGER;'
    },
    {
      name: 'custom_duration',
      sql: 'ALTER TABLE professional_availability ADD COLUMN IF NOT EXISTS custom_duration INTEGER;'
    }
  ];

  for (const column of columnsToAdd) {
    try {
      console.log(`📝 Adicionando coluna: ${column.name}`);
      
      const { data, error } = await supabase.rpc('exec_sql', {
        sql_query: column.sql
      });

      if (error) {
        console.log(`⚠️  Erro ao adicionar ${column.name}:`, error.message);
        console.log('💡 Isso pode ser normal se a coluna já existe');
      } else {
        console.log(`✅ Coluna ${column.name} adicionada com sucesso`);
      }
    } catch (error) {
      console.log(`❌ Erro geral ao adicionar ${column.name}:`, error.message);
    }
  }

  // Verificar estrutura da tabela
  console.log('\n🔍 VERIFICANDO ESTRUTURA DA TABELA:');
  
  try {
    const { data, error } = await supabase
      .from('professional_availability')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao verificar tabela:', error);
    } else {
      console.log('✅ Tabela acessível');
      
      if (data && data.length > 0) {
        const columns = Object.keys(data[0]);
        console.log('📋 Colunas disponíveis:');
        columns.forEach((col, index) => {
          console.log(`   ${index + 1}. ${col}`);
        });
      } else {
        console.log('📋 Tabela vazia, mas estrutura OK');
      }
    }
  } catch (error) {
    console.error('❌ Erro ao verificar estrutura:', error);
  }

  console.log('\n' + '='.repeat(50));
  console.log('✅ PROCESSO CONCLUÍDO!');
}

addColumns();
