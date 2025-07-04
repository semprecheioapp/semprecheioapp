const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function testAppointments() {
  console.log('🔍 Verificando dados de agendamentos...\n');

  // 1. Verificar appointments
  const { data: appointments, error: appointmentsError } = await supabase
    .from('appointments')
    .select('*')
    .limit(10);

  console.log('📅 APPOINTMENTS:');
  console.log('Count:', appointments?.length || 0);
  console.log('Error:', appointmentsError);
  console.log('All appointments:', appointments);
  console.log('');

  // 1.1 Verificar appointments para client específico
  const { data: clientAppointments, error: clientError } = await supabase
    .from('appointments')
    .select('*')
    .eq('client_id', '07cd1640-dd11-425c-b51c-0bea628d448d');

  console.log('📅 APPOINTMENTS FOR CLIENT 07cd1640-dd11-425c-b51c-0bea628d448d:');
  console.log('Count:', clientAppointments?.length || 0);
  console.log('Error:', clientError);
  console.log('Data:', clientAppointments);
  console.log('');

  // 2. Verificar professionals
  const { data: professionals, error: profError } = await supabase
    .from('professionals')
    .select('*')
    .limit(3);

  console.log('👨‍⚕️ PROFESSIONALS:');
  console.log('Count:', professionals?.length || 0);
  console.log('Error:', profError);
  console.log('Sample data:', professionals?.[0]);
  console.log('');

  // 3. Verificar customers
  const { data: customers, error: custError } = await supabase
    .from('customers')
    .select('*')
    .limit(3);

  console.log('👤 CUSTOMERS:');
  console.log('Count:', customers?.length || 0);
  console.log('Error:', custError);
  console.log('Sample data:', customers?.[0]);
  console.log('');

  // 4. Verificar services
  const { data: services, error: servError } = await supabase
    .from('services')
    .select('*')
    .limit(3);

  console.log('🔧 SERVICES:');
  console.log('Count:', services?.length || 0);
  console.log('Error:', servError);
  console.log('Sample data:', services?.[0]);
}

testAppointments().catch(console.error);
