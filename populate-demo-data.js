import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

async function populateDemoData() {
  console.log('🚀 Populando dados de demonstração...');
  
  try {
    // 1. Verificar se cliente já existe
    console.log('👥 Verificando cliente principal...');
    let { data: client } = await supabase
      .from('clients')
      .select('*')
      .eq('email', 'semprecheioapp@gmail.com')
      .single();

    if (!client) {
      console.log('👥 Criando cliente principal...');
      const { data: newClient, error: clientError } = await supabase
        .from('clients')
        .insert([
          {
            name: 'Clínica MBK Estética',
            email: 'semprecheioapp@gmail.com',
            phone: '(11) 99999-9999',
            service_type: 'clinica',
            agent_name: 'Assistente MBK',
            prompt_ia: 'Você é um assistente virtual especializado em agendamentos para clínica de estética. Seja sempre cordial e profissional.',
            is_active: true
          }
        ])
        .select()
        .single();

      if (clientError) {
        console.log('❌ Erro ao criar cliente:', clientError.message);
        return;
      }
      client = newClient;
    }
    
    console.log('✅ Cliente criado:', client.name);
    
    // 2. Criar especialidades primeiro
    console.log('🎯 Criando especialidades...');
    const specialties = [
      {
        name: 'Dermatologia',
        description: 'Tratamentos dermatológicos e estéticos',
        color: '#3B82F6',
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Estética Facial',
        description: 'Tratamentos faciais e rejuvenescimento',
        color: '#10B981',
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Massoterapia',
        description: 'Massagens terapêuticas e relaxantes',
        color: '#F59E0B',
        client_id: client.id,
        is_active: true
      }
    ];

    const { data: specialtiesData, error: specError } = await supabase
      .from('specialties')
      .insert(specialties)
      .select();

    if (specError) {
      console.log('❌ Erro ao criar especialidades:', specError.message);
      return;
    }

    console.log('✅ Especialidades criadas:', specialtiesData.length);

    // 3. Criar profissionais
    console.log('👨‍⚕️ Criando profissionais...');
    const professionals = [
      {
        name: 'Dr. João Silva',
        email: 'joao@clinicambk.com',
        phone: '(11) 88888-8888',
        specialty_id: specialtiesData[0].id,
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Dra. Maria Santos',
        email: 'maria@clinicambk.com',
        phone: '(11) 77777-7777',
        specialty_id: specialtiesData[1].id,
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Ana Costa',
        email: 'ana@clinicambk.com',
        phone: '(11) 66666-6666',
        specialty_id: specialtiesData[2].id,
        client_id: client.id,
        is_active: true
      }
    ];

    const { data: professionalsData, error: profError } = await supabase
      .from('professionals')
      .insert(professionals)
      .select();
    
    if (profError) {
      console.log('❌ Erro ao criar profissionais:', profError.message);
      return;
    }
    
    console.log('✅ Profissionais criados:', professionalsData.length);
    
    // 4. Criar serviços
    console.log('💼 Criando serviços...');
    const services = [
      {
        name: 'Limpeza de Pele',
        description: 'Limpeza profunda da pele com extração de cravos',
        duration: 60,
        price: 150.00,
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Peeling Químico',
        description: 'Renovação celular com ácidos específicos',
        duration: 45,
        price: 200.00,
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Massagem Relaxante',
        description: 'Massagem corporal para relaxamento e bem-estar',
        duration: 90,
        price: 180.00,
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Hidratação Facial',
        description: 'Tratamento hidratante para todos os tipos de pele',
        duration: 50,
        price: 120.00,
        client_id: client.id,
        is_active: true
      },
      {
        name: 'Drenagem Linfática',
        description: 'Massagem para redução de inchaço e toxinas',
        duration: 60,
        price: 160.00,
        client_id: client.id,
        is_active: true
      }
    ];
    
    const { data: servicesData, error: servError } = await supabase
      .from('services')
      .insert(services)
      .select();
    
    if (servError) {
      console.log('❌ Erro ao criar serviços:', servError.message);
      return;
    }
    
    console.log('✅ Serviços criados:', servicesData.length);
    
    // 5. Criar clientes finais
    console.log('👤 Criando clientes finais...');
    const customers = [
      {
        name: 'Ana Silva',
        email: 'ana.silva@email.com',
        phone: '(11) 91111-1111',
        client_id: client.id
      },
      {
        name: 'Carlos Santos',
        email: 'carlos.santos@email.com',
        phone: '(11) 92222-2222',
        client_id: client.id
      },
      {
        name: 'Fernanda Costa',
        email: 'fernanda.costa@email.com',
        phone: '(11) 93333-3333',
        client_id: client.id
      },
      {
        name: 'Roberto Lima',
        email: 'roberto.lima@email.com',
        phone: '(11) 94444-4444',
        client_id: client.id
      },
      {
        name: 'Juliana Oliveira',
        email: 'juliana.oliveira@email.com',
        phone: '(11) 95555-5555',
        client_id: client.id
      }
    ];
    
    const { data: customersData, error: custError } = await supabase
      .from('customers')
      .insert(customers)
      .select();
    
    if (custError) {
      console.log('❌ Erro ao criar clientes finais:', custError.message);
      return;
    }
    
    console.log('✅ Clientes finais criados:', customersData.length);
    
    // 6. Criar agendamentos
    console.log('📅 Criando agendamentos...');
    const now = new Date();
    const appointments = [
      {
        professional_id: professionalsData[0].id,
        service_id: servicesData[0].id,
        client_id: client.id,
        scheduled_at: new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString(), // Amanhã
        start_time: '09:00',
        end_time: '10:00',
        duration: 60,
        status: 'scheduled',
        notes: 'Primeira consulta'
      },
      {
        professional_id: professionalsData[1].id,
        service_id: servicesData[1].id,
        client_id: client.id,
        scheduled_at: new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000).toISOString(), // Depois de amanhã
        start_time: '14:00',
        end_time: '14:45',
        duration: 45,
        status: 'scheduled',
        notes: 'Retorno'
      },
      {
        professional_id: professionalsData[2].id,
        service_id: servicesData[2].id,
        client_id: client.id,
        scheduled_at: new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000).toISOString(),
        start_time: '16:00',
        end_time: '17:30',
        duration: 90,
        status: 'scheduled',
        notes: 'Sessão de relaxamento'
      }
    ];
    
    const { data: appointmentsData, error: appError } = await supabase
      .from('appointments')
      .insert(appointments)
      .select();
    
    if (appError) {
      console.log('❌ Erro ao criar agendamentos:', appError.message);
      return;
    }
    
    console.log('✅ Agendamentos criados:', appointmentsData.length);
    
    console.log('\n🎉 Dados de demonstração criados com sucesso!');
    console.log('\n📊 Resumo:');
    console.log(`- 1 Cliente: ${client.name}`);
    console.log(`- ${professionalsData.length} Profissionais`);
    console.log(`- ${servicesData.length} Serviços`);
    console.log(`- ${customersData.length} Clientes Finais`);
    console.log(`- ${appointmentsData.length} Agendamentos`);
    console.log('\n🔑 Login: semprecheioapp@gmail.com');
    
  } catch (error) {
    console.log('❌ Erro geral:', error.message);
  }
}

populateDemoData();
