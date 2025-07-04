const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://pczxuphbnmtfgoclwapc.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InBjenh1cGhibm10ZmdvY2x3YXBjIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDcwNTgzOTIsImV4cCI6MjA2MjYzNDM5Mn0.n612pus6MMVO-26U3v55AvRIPMSWrNfx67tUwczvoRo';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkServicesPrices() {
  console.log('🔍 Verificando preços dos serviços...\n');

  // Buscar serviços da empresa teste@teste.com
  const clientId = '07cd1640-dd11-425c-b51c-0bea628d448d';
  
  const { data: services, error } = await supabase
    .from('services')
    .select('*')
    .eq('client_id', clientId)
    .eq('is_active', true);

  if (error) {
    console.error('❌ Erro ao buscar serviços:', error);
    return;
  }

  console.log(`📋 SERVIÇOS DA EMPRESA (${clientId}):`);
  console.log(`Total: ${services?.length || 0} serviços\n`);

  if (services && services.length > 0) {
    services.forEach((service, index) => {
      console.log(`${index + 1}. ${service.name}`);
      console.log(`   ID: ${service.id}`);
      console.log(`   Preço: ${service.price ? `R$ ${(service.price / 100).toFixed(2)}` : 'NÃO DEFINIDO'}`);
      console.log(`   Duração: ${service.duration} min`);
      console.log(`   Categoria: ${service.category || 'N/A'}`);
      console.log(`   Ativo: ${service.is_active}`);
      console.log('');
    });

    // Calcular estatísticas
    const servicesWithPrice = services.filter(s => s.price && s.price > 0);
    const servicesWithoutPrice = services.filter(s => !s.price || s.price <= 0);
    
    console.log('📊 ESTATÍSTICAS:');
    console.log(`✅ Serviços com preço: ${servicesWithPrice.length}`);
    console.log(`❌ Serviços sem preço: ${servicesWithoutPrice.length}`);
    
    if (servicesWithPrice.length > 0) {
      const totalRevenue = servicesWithPrice.reduce((sum, s) => sum + s.price, 0);
      const avgPrice = totalRevenue / servicesWithPrice.length;
      console.log(`💰 Preço médio: R$ ${(avgPrice / 100).toFixed(2)}`);
      console.log(`💰 Preço mínimo: R$ ${(Math.min(...servicesWithPrice.map(s => s.price)) / 100).toFixed(2)}`);
      console.log(`💰 Preço máximo: R$ ${(Math.max(...servicesWithPrice.map(s => s.price)) / 100).toFixed(2)}`);
    }
  } else {
    console.log('❌ Nenhum serviço encontrado para esta empresa');
  }
}

checkServicesPrices().catch(console.error);
