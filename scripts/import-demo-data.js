#!/usr/bin/env node

/**
 * Script de Importação de Dados de Demonstração
 * Popula o banco com dados reais para testes e demonstração
 */

import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// Dados de demonstração realistas
const DEMO_DATA = {
  clients: [
    {
      id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      name: 'Clínica MBK',
      email: 'clinica@mbk.com.br',
      password: 'Admin123!',
      phone: '11987654321',
      service_type: 'Clínica Médica',
      whatsapp_instance_url: 'https://api.whatsapp.com/mbk',
      settings: { theme: 'blue', notifications: true },
      assistant_id: 'asst_clinica_mbk',
      is_active: true
    },
    {
      id: 'a8b9c0d1-e2f3-4567-8901-234567890123',
      name: 'Estética Bella',
      email: 'contato@esteticabella.com',
      password: 'Admin123!',
      phone: '11976543210',
      service_type: 'Estética',
      whatsapp_instance_url: 'https://api.whatsapp.com/bella',
      settings: { theme: 'pink', notifications: true },
      assistant_id: 'asst_estetica_bella',
      is_active: true
    },
    {
      id: 'b9c0d1e2-f3g4-5678-9012-345678901234',
      name: 'Salão Style',
      email: 'salao@style.com.br',
      password: 'Admin123!',
      phone: '11965432109',
      service_type: 'Salão de Beleza',
      whatsapp_instance_url: 'https://api.whatsapp.com/style',
      settings: { theme: 'purple', notifications: true },
      assistant_id: 'asst_salao_style',
      is_active: true
    }
  ],

  specialties: [
    {
      id: 'e86693ff-00c3-43d1-ab19-6e242b8fa123',
      name: 'Cardiologia',
      description: 'Especialidade médica focada no coração',
      color: '#EF4444',
      is_active: true
    },
    {
      id: '8fc38427-21d9-4515-b65c-e4bb3199086e',
      name: 'Dermatologia',
      description: 'Cuidados com a pele',
      color: '#10B981',
      is_active: true
    },
    {
      id: 'f1234567-89ab-cdef-0123-456789abcdef',
      name: 'Estética Facial',
      description: 'Tratamentos estéticos para o rosto',
      color: '#F59E0B',
      is_active: true
    },
    {
      id: 'g2345678-9abc-def0-1234-56789abcdef0',
      name: 'Cabelo',
      description: 'Cortes e tratamentos capilares',
      color: '#8B5CF6',
      is_active: true
    }
  ],

  professionals: [
    {
      id: '2c74898b-d09b-47a5-b3a5-9f9ca52f7755',
      name: 'Dr. Carlos Silva',
      email: 'carlos@mbk.com.br',
      phone: '11987654322',
      specialty_id: 'e86693ff-00c3-43d1-ab19-6e242b8fa123',
      client_id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      is_active: true
    },
    {
      id: 'h3456789-abcd-ef01-2345-6789abcdef01',
      name: 'Dra. Maria Santos',
      email: 'maria@mbk.com.br',
      phone: '11987654323',
      specialty_id: '8fc38427-21d9-4515-b65c-e4bb3199086e',
      client_id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      is_active: true
    },
    {
      id: 'i4567890-bcde-f012-3456-789abcdef012',
      name: 'Ana Costa',
      email: 'ana@esteticabella.com',
      phone: '11976543211',
      specialty_id: 'f1234567-89ab-cdef-0123-456789abcdef',
      client_id: 'a8b9c0d1-e2f3-4567-8901-234567890123',
      is_active: true
    },
    {
      id: 'j5678901-cdef-0123-4567-89abcdef0123',
      name: 'Bruno Hair',
      email: 'bruno@style.com.br',
      phone: '11965432108',
      specialty_id: 'g2345678-9abc-def0-1234-56789abcdef0',
      client_id: 'b9c0d1e2-f3g4-5678-9012-345678901234',
      is_active: true
    }
  ],

  services: [
    {
      id: '72a460d7-f896-4744-bbe5-51329e85f56a',
      name: 'Consulta Cardiológica',
      description: 'Consulta completa com cardiologista',
      duration: 60,
      price: 250.00,
      specialty_id: 'e86693ff-00c3-43d1-ab19-6e242b8fa123',
      client_id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      is_active: true
    },
    {
      id: 'k6789012-def0-1234-5678-9abcdef01234',
      name: 'Consulta Dermatológica',
      description: 'Avaliação dermatológica completa',
      duration: 45,
      price: 200.00,
      specialty_id: '8fc38427-21d9-4515-b65c-e4bb3199086e',
      client_id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      is_active: true
    },
    {
      id: 'l7890123-ef01-2345-6789-abcdef012345',
      name: 'Limpeza de Pele',
      description: 'Limpeza profunda e hidratação',
      duration: 90,
      price: 150.00,
      specialty_id: 'f1234567-89ab-cdef-0123-456789abcdef',
      client_id: 'a8b9c0d1-e2f3-4567-8901-234567890123',
      is_active: true
    },
    {
      id: 'm8901234-f012-3456-789a-bcdef0123456',
      name: 'Corte Masculino',
      description: 'Corte de cabelo moderno',
      duration: 45,
      price: 80.00,
      specialty_id: 'g2345678-9abc-def0-1234-56789abcdef0',
      client_id: 'b9c0d1e2-f3g4-5678-9012-345678901234',
      is_active: true
    }
  ],

  customers: [
    {
      id: '33f9b461-b39e-4b29-a83c-6dd92c3280d9',
      name: 'Manoel Silva',
      email: 'manoel@email.com',
      phone: '556699618890',
      cpf_cnpj: '123.456.789-10',
      notes: 'Cliente regular da clínica',
      thread: null
    },
    {
      id: 'n9012345-0123-4567-89ab-cdef01234567',
      name: 'Sandra Costa',
      email: 'sandra@email.com',
      phone: '11987654324',
      cpf_cnpj: '987.654.321-00',
      notes: 'Alérgica a alguns produtos',
      thread: null
    },
    {
      id: 'o0123456-1234-5678-9abc-def012345678',
      name: 'Roberto Lima',
      email: 'roberto@email.com',
      phone: '11976543212',
      cpf_cnpj: '456.789.123-45',
      notes: 'Preferência por horários manhã',
      thread: null
    }
  ],

  professional_availability: [
    {
      id: '359f140d-77e7-4141-87b4-7f8cfe54a0fa',
      professional_id: '2c74898b-d09b-47a5-b3a5-9f9ca52f7755',
      date: '2025-06-27',
      day_of_week: null,
      start_time: '14:00:00',
      end_time: '16:00:00',
      is_active: true
    },
    {
      id: 'p1234567-2345-6789-abcd-ef0123456789',
      professional_id: 'h3456789-abcd-ef01-2345-6789abcdef01',
      date: '2025-06-28',
      day_of_week: null,
      start_time: '09:00:00',
      end_time: '12:00:00',
      is_active: true
    }
  ],

  appointments: [
    {
      id: 'f1e0d619-9631-4578-b30f-6407d96afdbb',
      client_id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      professional_id: '2c74898b-d09b-47a5-b3a5-9f9ca52f7755',
      service_id: '72a460d7-f896-4744-bbe5-51329e85f56a',
      customer_id: '33f9b461-b39e-4b29-a83c-6dd92c3280d9',
      availability_id: '359f140d-77e7-4141-87b4-7f8cfe54a0fa',
      appointment_time: '2025-06-27T14:00:00Z',
      status: 'confirmado'
    }
  ],

  connections: [
    {
      id: 'q2345678-3456-789a-bcde-f01234567890',
      client_id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      instance_name: 'MBK_Principal',
      host: 'api.whatsapp.mbk.com',
      token: 'mbk_token_12345',
      status: 'connected',
      sync_status: 'synced'
    },
    {
      id: 'r3456789-4567-89ab-cdef-012345678901',
      client_id: 'a8b9c0d1-e2f3-4567-8901-234567890123',
      instance_name: 'Bella_WhatsApp',
      host: 'api.whatsapp.bella.com',
      token: 'bella_token_67890',
      status: 'connected',
      sync_status: 'synced'
    }
  ]
};

async function importTable(tableName, data) {
  console.log(`📊 Importando ${data.length} registros para ${tableName}...`);
  
  try {
    // Para clientes, criptografar senhas
    if (tableName === 'clients') {
      for (let client of data) {
        client.password = await bcrypt.hash(client.password, 12);
      }
    }
    
    const { data: result, error } = await supabase
      .from(tableName)
      .upsert(data, { onConflict: 'id' });
    
    if (error) {
      console.log(`❌ Erro em ${tableName}: ${error.message}`);
      return false;
    } else {
      console.log(`✅ ${tableName}: ${data.length} registros importados`);
      return true;
    }
  } catch (err) {
    console.log(`❌ Erro em ${tableName}: ${err.message}`);
    return false;
  }
}

async function importAllData() {
  console.log('🚀 Iniciando importação de dados de demonstração...\n');
  
  let successCount = 0;
  let totalCount = 0;
  
  // Ordem de importação respeitando foreign keys
  const importOrder = [
    ['clients', DEMO_DATA.clients],
    ['specialties', DEMO_DATA.specialties],
    ['professionals', DEMO_DATA.professionals],
    ['services', DEMO_DATA.services],
    ['customers', DEMO_DATA.customers],
    ['professional_availability', DEMO_DATA.professional_availability],
    ['appointments', DEMO_DATA.appointments],
    ['connections', DEMO_DATA.connections]
  ];
  
  for (const [tableName, data] of importOrder) {
    if (data && data.length > 0) {
      totalCount++;
      const success = await importTable(tableName, data);
      if (success) successCount++;
      
      // Aguardar um pouco entre as importações
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  
  console.log(`\n📊 Resumo da importação:`);
  console.log(`✅ Tabelas importadas: ${successCount}/${totalCount}`);
  
  if (successCount === totalCount) {
    console.log(`\n🎉 Todos os dados foram importados com sucesso!`);
    console.log(`\n👥 Usuários de teste criados:`);
    console.log(`   📧 clinica@mbk.com.br / Senha: Admin123!`);
    console.log(`   📧 contato@esteticabella.com / Senha: Admin123!`);
    console.log(`   📧 salao@style.com.br / Senha: Admin123!`);
    console.log(`\n📋 Próximo passo: npm run dev`);
  } else {
    console.log(`\n⚠️  Algumas importações falharam. Verifique os erros acima.`);
  }
}

// Verificar configurações
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.log('❌ Erro: Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas');
  console.log('💡 Execute primeiro: npm run setup-supabase');
  process.exit(1);
}

importAllData().catch(console.error);