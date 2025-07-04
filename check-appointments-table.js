// Script para verificar estrutura da tabela appointments
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

async function checkAppointmentsTable() {
  console.log('🔍 VERIFICANDO ESTRUTURA DA TABELA APPOINTMENTS...\n');

  try {
    // 1. Verificar se a tabela existe e suas colunas
    console.log('📋 Verificando estrutura da tabela:');
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .limit(1);

    if (error) {
      console.error('❌ Erro ao acessar tabela appointments:', error);
      console.log('💡 A tabela pode não existir ou ter problemas de permissão');
      return;
    }

    console.log('✅ Tabela appointments acessível');

    if (data && data.length > 0) {
      const columns = Object.keys(data[0]);
      console.log('📋 Colunas disponíveis:');
      columns.forEach((col, index) => {
        console.log(`   ${index + 1}. ${col}`);
      });
    } else {
      console.log('📋 Tabela vazia, mas estrutura OK');
    }

    // 2. Verificar todos os registros existentes
    console.log('\n📊 Verificando registros existentes:');
    const { data: allAppointments, error: allError } = await supabase
      .from('appointments')
      .select('*')
      .order('created_at', { ascending: false });

    if (allError) {
      console.error('❌ Erro ao buscar appointments:', allError);
    } else {
      console.log(`✅ Total de appointments: ${allAppointments?.length || 0}`);
      
      if (allAppointments && allAppointments.length > 0) {
        console.log('\n📋 Primeiros registros:');
        allAppointments.slice(0, 3).forEach((appointment, index) => {
          console.log(`\n   ${index + 1}. ID: ${appointment.id}`);
          console.log(`      Client ID: ${appointment.client_id || 'N/A'}`);
          console.log(`      Professional ID: ${appointment.professional_id || 'N/A'}`);
          console.log(`      Service ID: ${appointment.service_id || 'N/A'}`);
          console.log(`      Customer ID: ${appointment.customer_id || 'N/A'}`);
          console.log(`      Availability ID: ${appointment.availability_id || 'N/A'}`);
          console.log(`      Specialty ID: ${appointment.specialty_id || 'N/A'}`);
          console.log(`      Appointment Time: ${appointment.appointment_time || 'N/A'}`);
          console.log(`      Scheduled At: ${appointment.scheduled_at || 'N/A'}`);
          console.log(`      Status: ${appointment.status || 'N/A'}`);
          console.log(`      Created At: ${appointment.created_at || 'N/A'}`);
        });
      }
    }

    // 3. Verificar tabelas relacionadas
    console.log('\n🔗 Verificando tabelas relacionadas:');
    
    const tables = [
      { name: 'clients', description: 'Empresas/Clientes' },
      { name: 'professionals', description: 'Profissionais' },
      { name: 'services', description: 'Serviços' },
      { name: 'specialties', description: 'Especialidades' },
      { name: 'customers', description: 'Clientes Finais' },
      { name: 'professional_availability', description: 'Disponibilidade' }
    ];

    for (const table of tables) {
      try {
        const { data: tableData, error: tableError } = await supabase
          .from(table.name)
          .select('id')
          .limit(1);

        if (tableError) {
          console.log(`   ❌ ${table.description} (${table.name}): ${tableError.message}`);
        } else {
          const { count } = await supabase
            .from(table.name)
            .select('*', { count: 'exact', head: true });
          
          console.log(`   ✅ ${table.description} (${table.name}): ${count || 0} registros`);
        }
      } catch (error) {
        console.log(`   ❌ ${table.description} (${table.name}): Erro ao verificar`);
      }
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ VERIFICAÇÃO CONCLUÍDA!');
    console.log('💡 Informações importantes:');
    console.log('   - Verifique se todas as colunas necessárias existem');
    console.log('   - Confirme se as tabelas relacionadas têm dados');
    console.log('   - Note a estrutura atual para implementar o frontend');

  } catch (error) {
    console.error('❌ Erro geral:', error);
  }
}

checkAppointmentsTable();
