#!/usr/bin/env node

/**
 * Backup Completo SempreCheioApp - Junho 2025
 * 
 * Este script cria um backup completo incluindo:
 * - Estrutura do projeto
 * - Dados do banco Supabase
 * - Configurações e dependências
 */

import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const BACKUP_DATE = new Date().toISOString().split('T')[0];
const BACKUP_DIR = `backup-semprecheioapp-${BACKUP_DATE}`;

// Configuração do Supabase
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ SUPABASE_URL e SUPABASE_KEY são necessários');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function createBackupDirectory() {
  if (!fs.existsSync(BACKUP_DIR)) {
    fs.mkdirSync(BACKUP_DIR, { recursive: true });
  }
  console.log(`📁 Diretório de backup criado: ${BACKUP_DIR}`);
}

async function backupSupabaseData() {
  console.log('📊 Iniciando backup dos dados do Supabase...');
  
  const tables = [
    'users',
    'sessions', 
    'clients',
    'professionals',
    'specialties',
    'services',
    'appointments',
    'customers',
    'connections',
    'professional_availability',
    'notifications',
    'documents',
    'memoria',
    'token_accounting',
    'bd_ativo'
  ];

  const backupData = {
    timestamp: new Date().toISOString(),
    tables: {}
  };

  for (const table of tables) {
    try {
      console.log(`  📋 Fazendo backup da tabela: ${table}`);
      const { data, error } = await supabase.from(table).select('*');
      
      if (error) {
        console.warn(`  ⚠️  Erro na tabela ${table}:`, error.message);
        backupData.tables[table] = { error: error.message, data: [] };
      } else {
        backupData.tables[table] = { 
          count: data?.length || 0, 
          data: data || [],
          success: true
        };
        console.log(`  ✅ ${table}: ${data?.length || 0} registros`);
      }
    } catch (err) {
      console.warn(`  ❌ Falha na tabela ${table}:`, err.message);
      backupData.tables[table] = { error: err.message, data: [] };
    }
  }

  // Salvar backup dos dados
  const dataBackupPath = path.join(BACKUP_DIR, 'supabase-data-backup.json');
  fs.writeFileSync(dataBackupPath, JSON.stringify(backupData, null, 2));
  console.log(`✅ Backup dos dados salvo em: ${dataBackupPath}`);

  return backupData;
}

async function backupProjectStructure() {
  console.log('📁 Fazendo backup da estrutura do projeto...');
  
  const filesToBackup = [
    'package.json',
    'package-lock.json',
    'tsconfig.json',
    'vite.config.ts',
    'tailwind.config.ts',
    'postcss.config.js',
    'components.json',
    'drizzle.config.ts',
    'replit.md',
    '.replit'
  ];

  const directoriesToBackup = [
    'client',
    'server', 
    'shared',
    'scripts'
  ];

  // Backup dos arquivos de configuração
  for (const file of filesToBackup) {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf8');
      const backupPath = path.join(BACKUP_DIR, 'project-files', file);
      
      // Criar diretório se não existir
      const dir = path.dirname(backupPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      
      fs.writeFileSync(backupPath, content);
      console.log(`  ✅ ${file}`);
    }
  }

  // Backup dos diretórios
  for (const dir of directoriesToBackup) {
    if (fs.existsSync(dir)) {
      copyDirectory(dir, path.join(BACKUP_DIR, 'project-files', dir));
      console.log(`  ✅ Diretório: ${dir}`);
    }
  }
}

function copyDirectory(src, dest) {
  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true });
  }

  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    // Pular node_modules e outros diretórios desnecessários
    if (entry.name === 'node_modules' || entry.name === '.git' || entry.name.startsWith('.')) {
      continue;
    }

    if (entry.isDirectory()) {
      copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

async function generateBackupSummary(supabaseBackup) {
  console.log('📋 Gerando resumo do backup...');
  
  const summary = {
    backup_date: new Date().toISOString(),
    backup_version: 'v2.0-complete',
    project_name: 'SempreCheioApp',
    total_tables: Object.keys(supabaseBackup.tables).length,
    total_records: Object.values(supabaseBackup.tables)
      .reduce((total, table) => total + (table.count || 0), 0),
    
    database_summary: {},
    important_notes: [
      'Backup completo realizado antes das implementações do Agente IA',
      'Inclui estrutura completa do projeto e dados do Supabase',
      'Sistema de agenda funcionando com agendamentos confirmados',
      'WhatsApp Channels implementado e funcional',
      'Agente IA com busca de clientes e salvamento de prompts'
    ],
    
    project_status: {
      frontend: 'React + TypeScript + Vite',
      backend: 'Express.js + Node.js',
      database: 'Supabase PostgreSQL',
      ui_library: 'shadcn/ui + Tailwind CSS',
      state_management: 'TanStack Query',
      authentication: 'Session-based with bcrypt'
    }
  };

  // Resumo por tabela
  for (const [tableName, tableData] of Object.entries(supabaseBackup.tables)) {
    if (tableData.success) {
      summary.database_summary[tableName] = {
        records: tableData.count,
        status: 'success'
      };
    } else {
      summary.database_summary[tableName] = {
        records: 0,
        status: 'error',
        error: tableData.error
      };
    }
  }

  const summaryPath = path.join(BACKUP_DIR, 'BACKUP_SUMMARY.json');
  fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));
  
  // Criar README do backup
  const readmePath = path.join(BACKUP_DIR, 'README_BACKUP.md');
  const readmeContent = `# Backup SempreCheioApp - ${BACKUP_DATE}

## 📋 Resumo do Backup

**Data:** ${new Date().toLocaleString('pt-BR')}
**Versão:** v2.0-complete
**Total de Tabelas:** ${summary.total_tables}
**Total de Registros:** ${summary.total_records}

## 🗃️ Estrutura do Backup

### \`supabase-data-backup.json\`
Backup completo de todos os dados do banco Supabase, incluindo:
${Object.keys(summary.database_summary).map(table => 
  `- **${table}**: ${summary.database_summary[table].records} registros`
).join('\n')}

### \`project-files/\`
Estrutura completa do projeto incluindo:
- Código fonte (client/, server/, shared/)
- Configurações (package.json, tsconfig.json, etc.)
- Scripts e utilitários
- Documentação (replit.md)

## 🚀 Estado da Aplicação

### Funcionalidades Implementadas
✅ Sistema de autenticação com sessões
✅ Agenda com agendamentos confirmados
✅ Gerenciamento de clientes, profissionais e serviços
✅ WhatsApp Channels funcional
✅ Agente IA com busca e salvamento de prompts
✅ Interface responsiva com modo escuro

### Tecnologias
- **Frontend:** React 18 + TypeScript + Vite
- **Backend:** Express.js + Node.js
- **Banco:** Supabase PostgreSQL (15 tabelas ativas)
- **UI:** shadcn/ui + Tailwind CSS
- **Estado:** TanStack Query

## 📝 Notas Importantes

${summary.important_notes.map(note => `- ${note}`).join('\n')}

## 🔧 Como Restaurar

1. Restaurar estrutura do projeto a partir de \`project-files/\`
2. Configurar variáveis de ambiente (SUPABASE_URL, SUPABASE_KEY)
3. Executar \`npm install\` para instalar dependências
4. Importar dados do banco a partir de \`supabase-data-backup.json\`
5. Executar \`npm run dev\` para iniciar a aplicação

---
*Backup gerado automaticamente pelo sistema SempreCheioApp*
`;

  fs.writeFileSync(readmePath, readmeContent);
  
  console.log(`✅ Resumo salvo em: ${summaryPath}`);
  console.log(`✅ README salvo em: ${readmePath}`);
  
  return summary;
}

async function main() {
  console.log('🔄 Iniciando backup completo do SempreCheioApp...\n');
  
  try {
    // 1. Criar diretório de backup
    await createBackupDirectory();
    
    // 2. Backup dos dados do Supabase
    const supabaseBackup = await backupSupabaseData();
    
    // 3. Backup da estrutura do projeto
    await backupProjectStructure();
    
    // 4. Gerar resumo
    const summary = await generateBackupSummary(supabaseBackup);
    
    console.log('\n🎉 Backup completo finalizado com sucesso!');
    console.log(`📁 Local: ${BACKUP_DIR}`);
    console.log(`📊 ${summary.total_tables} tabelas, ${summary.total_records} registros`);
    console.log('\n✅ Backup pronto para download/arquivamento');
    
  } catch (error) {
    console.error('❌ Erro durante o backup:', error);
    process.exit(1);
  }
}

main();