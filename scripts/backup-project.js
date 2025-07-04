#!/usr/bin/env node

// Script para criar backup dos arquivos principais do projeto
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'fs';
import { join } from 'path';

const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const backupDir = `backup-${timestamp}`;

const criticalFiles = [
  './server/storage-clients-auth.ts',
  './server/routes.ts', 
  './server/index.ts',
  './shared/schema.ts',
  './client/src/pages/super-admin-agenda.tsx',
  './client/src/pages/agenda.tsx',
  './client/src/pages/login.tsx',
  './package.json',
  './replit.md'
];

console.log(`Creating backup: ${backupDir}`);

if (!existsSync(backupDir)) {
  mkdirSync(backupDir, { recursive: true });
}

criticalFiles.forEach(file => {
  if (existsSync(file)) {
    const content = readFileSync(file, 'utf8');
    const backupPath = join(backupDir, file.replace(/\//g, '_'));
    writeFileSync(backupPath, content);
    console.log(`✓ Backed up: ${file}`);
  } else {
    console.log(`⚠ File not found: ${file}`);
  }
});

// Create summary file
const summary = {
  timestamp,
  version: 'Authentication System Working',
  features: [
    'Supabase integration with 15 tables',
    'Client-based authentication system', 
    'bcrypt password hashing',
    'Test users created (3 accounts)',
    'Professional agenda with real data',
    'Session management working'
  ],
  testUsers: [
    'agenciambkautomacoes@gmail.com / senha123',
    'super@admin.com / 123456',
    'admin@salon.com / 123456'
  ]
};

writeFileSync(join(backupDir, 'BACKUP_SUMMARY.json'), JSON.stringify(summary, null, 2));
console.log(`\n✅ Backup created successfully in: ${backupDir}`);
console.log('📋 Summary saved with project details and test users');