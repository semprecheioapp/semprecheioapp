#!/usr/bin/env node

/**
 * Script para Criar Tabelas no Supabase
 * Executa todo o setup do banco de dados automaticamente
 */

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

const SQL_COMMANDS = [
  // 1. Tabela de Clientes (Empresas)
  `CREATE TABLE IF NOT EXISTS clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT,
    phone TEXT,
    service_type TEXT,
    whatsapp_instance_url TEXT,
    settings JSONB DEFAULT '{}',
    assistant_id TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 2. Tabela de Especialidades
  `CREATE TABLE IF NOT EXISTS specialties (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    color TEXT DEFAULT '#3B82F6',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 3. Tabela de Profissionais
  `CREATE TABLE IF NOT EXISTS professionals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    specialty_id UUID REFERENCES specialties(id),
    client_id UUID REFERENCES clients(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 4. Tabela de Serviços
  `CREATE TABLE IF NOT EXISTS services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    duration INTEGER DEFAULT 60,
    price DECIMAL(10,2),
    specialty_id UUID REFERENCES specialties(id),
    client_id UUID REFERENCES clients(id),
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 5. Tabela de Clientes Finais
  `CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    email TEXT,
    phone TEXT,
    cpf_cnpj TEXT,
    notes TEXT,
    thread TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 6. Tabela de Disponibilidade dos Profissionais
  `CREATE TABLE IF NOT EXISTS professional_availability (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    professional_id UUID REFERENCES professionals(id),
    date DATE,
    day_of_week INTEGER,
    start_time TIME,
    end_time TIME,
    is_active BOOLEAN DEFAULT true,
    service_id UUID REFERENCES services(id),
    custom_price INTEGER,
    custom_duration INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 7. Tabela de Agendamentos
  `CREATE TABLE IF NOT EXISTS appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    professional_id UUID REFERENCES professionals(id),
    service_id UUID REFERENCES services(id),
    customer_id UUID REFERENCES customers(id),
    availability_id UUID REFERENCES professional_availability(id),
    scheduled_at TIMESTAMPTZ,
    status TEXT DEFAULT 'pendente',
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 8. Tabela de Conexões WhatsApp
  `CREATE TABLE IF NOT EXISTS connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    instance_name TEXT,
    host TEXT,
    token TEXT,
    status TEXT DEFAULT 'disconnected',
    sync_status TEXT DEFAULT 'idle',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 9. Tabela de Notificações
  `CREATE TABLE IF NOT EXISTS notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    title TEXT NOT NULL,
    message TEXT,
    type TEXT DEFAULT 'info',
    is_read BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 10. Tabela de Documentos
  `CREATE TABLE IF NOT EXISTS documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    name TEXT NOT NULL,
    type TEXT,
    url TEXT,
    size_bytes INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 11. Tabela de Memória IA
  `CREATE TABLE IF NOT EXISTS memoria (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    key TEXT NOT NULL,
    value JSONB,
    context TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 12. Tabela de Contabilidade de Tokens
  `CREATE TABLE IF NOT EXISTS token_accounting (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    operation TEXT NOT NULL,
    tokens_used INTEGER,
    cost DECIMAL(10,4),
    model TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
  );`,

  // 13. Tabela de Status do BD
  `CREATE TABLE IF NOT EXISTS bd_ativo (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    table_name TEXT NOT NULL,
    is_active BOOLEAN DEFAULT true,
    last_check TIMESTAMPTZ DEFAULT NOW()
  );`,

  // Índices para Performance
  `CREATE INDEX IF NOT EXISTS idx_clients_email ON clients(email);`,
  `CREATE INDEX IF NOT EXISTS idx_professionals_client_id ON professionals(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_client_id ON appointments(client_id);`,
  `CREATE INDEX IF NOT EXISTS idx_appointments_date ON appointments(appointment_time);`,
  `CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);`,
  
  // Row Level Security (RLS)
  `ALTER TABLE clients ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE professionals ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE services ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;`,
  `ALTER TABLE connections ENABLE ROW LEVEL SECURITY;`,
  
  // Políticas de Segurança
  `CREATE POLICY IF NOT EXISTS "clients_own_data" ON professionals
    FOR ALL USING (client_id = current_setting('app.current_client_id', true)::UUID);`,
    
  `CREATE POLICY IF NOT EXISTS "clients_own_services" ON services
    FOR ALL USING (client_id = current_setting('app.current_client_id', true)::UUID);`,
    
  `CREATE POLICY IF NOT EXISTS "clients_own_appointments" ON appointments
    FOR ALL USING (client_id = current_setting('app.current_client_id', true)::UUID);`
];

async function createTables() {
  console.log('🚀 Criando estrutura do banco de dados no Supabase...\n');
  
  let successCount = 0;
  let errorCount = 0;
  
  for (let i = 0; i < SQL_COMMANDS.length; i++) {
    const sql = SQL_COMMANDS[i];
    const commandName = sql.split(' ')[2] || `Comando ${i + 1}`;
    
    try {
      console.log(`⏳ Executando: ${commandName}...`);
      
      const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
      
      if (error) {
        // Tentar execução alternativa via API REST
        const response = await fetch(`${process.env.SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'apikey': process.env.SUPABASE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_KEY}`
          },
          body: JSON.stringify({ sql_query: sql })
        });
        
        if (!response.ok) {
          console.log(`⚠️  ${commandName}: ${error.message}`);
          errorCount++;
        } else {
          console.log(`✅ ${commandName}: Criado com sucesso`);
          successCount++;
        }
      } else {
        console.log(`✅ ${commandName}: Criado com sucesso`);
        successCount++;
      }
      
    } catch (err) {
      console.log(`❌ ${commandName}: ${err.message}`);
      errorCount++;
    }
  }
  
  console.log(`\n📊 Resumo da execução:`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  
  if (errorCount > 0) {
    console.log(`\n💡 Alguns comandos falharam. Isso pode ser normal se as tabelas já existem.`);
    console.log(`   Verifique manualmente no Supabase Dashboard se necessário.`);
  } else {
    console.log(`\n🎉 Todas as tabelas foram criadas com sucesso!`);
  }
  
  console.log(`\n📋 Próximo passo: npm run import-demo-data`);
}

// Verificar se as variáveis de ambiente estão configuradas
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_KEY) {
  console.log('❌ Erro: Variáveis SUPABASE_URL e SUPABASE_KEY não encontradas');
  console.log('💡 Execute primeiro: npm run setup-supabase');
  process.exit(1);
}

createTables().catch(console.error);