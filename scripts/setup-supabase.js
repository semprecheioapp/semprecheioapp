#!/usr/bin/env node

/**
 * Script de Setup Automático do Supabase
 * Configura automaticamente o projeto SempreCheioApp
 */

import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function askQuestion(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

async function main() {
  console.log('🚀 SETUP AUTOMÁTICO DO SUPABASE - SempreCheioApp\n');
  
  // Coletar dados do Supabase
  console.log('📋 Por favor, forneça as credenciais do seu projeto Supabase:\n');
  
  const supabaseUrl = await askQuestion('URL do Supabase (https://xxx.supabase.co): ');
  const supabaseKey = await askQuestion('Chave Anon do Supabase: ');
  const databasePassword = await askQuestion('Senha do banco de dados: ');
  
  // Construir DATABASE_URL
  const projectId = supabaseUrl.split('//')[1].split('.')[0];
  const databaseUrl = `postgresql://postgres:${databasePassword}@db.${projectId}.supabase.co:6543/postgres?pgbouncer=true`;
  
  console.log('\n🔧 Configurando variáveis de ambiente...');
  
  // Criar arquivo .env
  const envContent = `# === CONFIGURAÇÕES SUPABASE ===
DATABASE_URL=${databaseUrl}
SUPABASE_URL=${supabaseUrl}
SUPABASE_KEY=${supabaseKey}

# === CONFIGURAÇÕES DE PRODUÇÃO ===
NODE_ENV=development
PORT=5000

# === CONFIGURAÇÕES DE SEGURANÇA ===
SESSION_SECRET=${generateSecretKey()}
RATE_LIMIT_MAX=50
RATE_LIMIT_WINDOW=900000

# === CONFIGURAÇÕES OPCIONAIS ===
LOG_LEVEL=info
BACKUP_ENABLED=true
`;

  fs.writeFileSync('.env', envContent);
  console.log('✅ Arquivo .env criado com sucesso!');
  
  // Testar conexão
  console.log('\n🔌 Testando conexão com Supabase...');
  
  try {
    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('clients').select('count').limit(1);
    
    if (error && error.code === '42P01') {
      console.log('ℹ️  Tabelas ainda não existem - isso é normal para um projeto novo');
    } else if (error) {
      console.log('❌ Erro na conexão:', error.message);
      console.log('💡 Verifique se as credenciais estão corretas');
    } else {
      console.log('✅ Conexão com Supabase estabelecida com sucesso!');
    }
  } catch (err) {
    console.log('❌ Erro na conexão:', err.message);
  }
  
  console.log('\n📊 Próximos passos:');
  console.log('1. Execute: npm run db:setup (para criar as tabelas)');
  console.log('2. Execute: npm run import-demo-data (para dados de teste)');
  console.log('3. Execute: npm run dev (para iniciar o desenvolvimento)');
  
  rl.close();
}

function generateSecretKey() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  let result = '';
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

main().catch(console.error);