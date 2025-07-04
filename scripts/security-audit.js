#!/usr/bin/env node

/**
 * Auditoria de Segurança - SempreCheioApp
 * 
 * Script para avaliar a segurança do sistema antes da revenda comercial
 */

import fs from 'fs';
import path from 'path';

const AUDIT_DATE = new Date().toISOString().split('T')[0];
const AUDIT_REPORT = `security-audit-${AUDIT_DATE}.json`;

class SecurityAuditor {
  constructor() {
    this.findings = {
      critical: [],
      high: [],
      medium: [],
      low: [],
      passed: []
    };
    
    this.categories = {
      authentication: 'Autenticação e Autorização',
      dataProtection: 'Proteção de Dados',
      apiSecurity: 'Segurança da API',
      infrastructure: 'Infraestrutura',
      codeQuality: 'Qualidade do Código',
      privacy: 'Privacidade e LGPD'
    };
  }

  addFinding(severity, category, title, description, recommendation, status = 'fail') {
    const finding = {
      severity,
      category: this.categories[category] || category,
      title,
      description,
      recommendation,
      status,
      timestamp: new Date().toISOString()
    };

    if (status === 'pass') {
      this.findings.passed.push(finding);
    } else {
      this.findings[severity].push(finding);
    }
  }

  auditAuthentication() {
    console.log('🔐 Auditando Autenticação...');

    // Verificar se bcrypt está sendo usado
    const storageFile = fs.readFileSync('../server/storage-clients-auth.ts', 'utf8');
    
    if (storageFile.includes('bcrypt.compare') && storageFile.includes('bcrypt.hash')) {
      this.addFinding('low', 'authentication', 
        'Hash de Senha Seguro', 
        'Sistema utiliza bcrypt para hash de senhas',
        'Manter bcrypt atualizado',
        'pass'
      );
    } else {
      this.addFinding('critical', 'authentication',
        'Hash de Senha Inseguro',
        'Senhas não estão sendo adequadamente hasheadas',
        'Implementar bcrypt para todas as senhas'
      );
    }

    // Verificar middleware de autenticação
    const routesFile = fs.readFileSync('../server/routes.ts', 'utf8');
    
    if (routesFile.includes('requireAuth') && routesFile.includes('sessionId')) {
      this.addFinding('low', 'authentication',
        'Middleware de Autenticação',
        'Middleware de autenticação implementado corretamente',
        'Considerar implementar JWT para melhor escalabilidade',
        'pass'
      );
    } else {
      this.addFinding('high', 'authentication',
        'Middleware de Autenticação Ausente',
        'Rotas não estão adequadamente protegidas',
        'Implementar middleware de autenticação para todas as rotas protegidas'
      );
    }

    // Verificar gestão de sessões
    if (storageFile.includes('sessions') && storageFile.includes('expiresAt')) {
      this.addFinding('low', 'authentication',
        'Gestão de Sessões',
        'Sistema implementa expiração de sessões',
        'Considerar implementar renovação automática de sessões',
        'pass'
      );
    } else {
      this.addFinding('medium', 'authentication',
        'Gestão de Sessões Limitada',
        'Sessões podem não ter controle adequado de expiração',
        'Implementar controle robusto de sessões com TTL'
      );
    }
  }

  auditDataProtection() {
    console.log('🛡️ Auditando Proteção de Dados...');

    // Verificar validação de entrada
    const routesFile = fs.readFileSync('../server/routes.ts', 'utf8');
    
    if (routesFile.includes('safeParse') && routesFile.includes('zod')) {
      this.addFinding('low', 'dataProtection',
        'Validação de Entrada',
        'Sistema utiliza Zod para validação de dados',
        'Expandir validação para todos os endpoints',
        'pass'
      );
    } else {
      this.addFinding('high', 'dataProtection',
        'Validação de Entrada Insuficiente',
        'Dados de entrada não são adequadamente validados',
        'Implementar validação Zod em todos os endpoints'
      );
    }

    // Verificar sanitização SQL
    const storageFile = fs.readFileSync('../server/storage-clients-auth.ts', 'utf8');
    
    if (storageFile.includes('supabase') && !storageFile.includes('${') && !storageFile.includes('concat')) {
      this.addFinding('low', 'dataProtection',
        'Proteção contra SQL Injection',
        'Sistema utiliza ORM/Query Builder que previne SQL injection',
        'Manter uso do Supabase client e evitar queries raw',
        'pass'
      );
    } else {
      this.addFinding('high', 'dataProtection',
        'Risco de SQL Injection',
        'Possível concatenação de strings em queries SQL',
        'Utilizar apenas queries parametrizadas'
      );
    }

    // Verificar logs de dados sensíveis
    if (storageFile.includes('console.log') && (storageFile.includes('password') || storageFile.includes('token'))) {
      this.addFinding('medium', 'dataProtection',
        'Logs de Dados Sensíveis',
        'Logs podem conter informações sensíveis',
        'Remover ou mascarar dados sensíveis dos logs'
      );
    } else {
      this.addFinding('low', 'dataProtection',
        'Logs Seguros',
        'Logs não expõem dados sensíveis',
        'Manter boas práticas de logging',
        'pass'
      );
    }
  }

  auditApiSecurity() {
    console.log('🌐 Auditando Segurança da API...');

    const routesFile = fs.readFileSync('server/routes.ts', 'utf8');

    // Verificar rate limiting
    if (!routesFile.includes('rateLimit') && !routesFile.includes('express-rate-limit')) {
      this.addFinding('medium', 'apiSecurity',
        'Rate Limiting Ausente',
        'API não possui proteção contra ataques de força bruta',
        'Implementar rate limiting para endpoints sensíveis'
      );
    }

    // Verificar CORS
    if (!routesFile.includes('cors')) {
      this.addFinding('medium', 'apiSecurity',
        'CORS Não Configurado',
        'Política CORS não está explicitamente configurada',
        'Configurar CORS adequadamente para produção'
      );
    }

    // Verificar helmet.js
    if (!routesFile.includes('helmet')) {
      this.addFinding('medium', 'apiSecurity',
        'Headers de Segurança Ausentes',
        'Headers de segurança não estão configurados',
        'Implementar helmet.js para headers de segurança'
      );
    }

    // Verificar tratamento de erros
    if (routesFile.includes('try') && routesFile.includes('catch')) {
      this.addFinding('low', 'apiSecurity',
        'Tratamento de Erros',
        'API possui tratamento adequado de erros',
        'Evitar exposição de stack traces em produção',
        'pass'
      );
    } else {
      this.addFinding('high', 'apiSecurity',
        'Tratamento de Erros Inadequado',
        'Erros podem vazar informações sensíveis',
        'Implementar tratamento robusto de erros'
      );
    }
  }

  auditInfrastructure() {
    console.log('🏗️ Auditando Infraestrutura...');

    // Verificar variáveis de ambiente
    const envVars = [
      'DATABASE_URL',
      'SUPABASE_URL', 
      'SUPABASE_KEY'
    ];

    let envSecure = true;
    envVars.forEach(envVar => {
      if (!process.env[envVar]) {
        envSecure = false;
      }
    });

    if (envSecure) {
      this.addFinding('low', 'infrastructure',
        'Variáveis de Ambiente',
        'Credenciais estão em variáveis de ambiente',
        'Verificar se variáveis estão seguras em produção',
        'pass'
      );
    } else {
      this.addFinding('high', 'infrastructure',
        'Credenciais Expostas',
        'Algumas credenciais podem estar hardcoded',
        'Mover todas as credenciais para variáveis de ambiente'
      );
    }

    // Verificar dependências de segurança
    const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    const securityDeps = ['bcryptjs', 'cookie-parser'];
    
    let hasSecurityDeps = true;
    securityDeps.forEach(dep => {
      if (!packageJson.dependencies[dep] && !packageJson.devDependencies?.[dep]) {
        hasSecurityDeps = false;
      }
    });

    if (hasSecurityDeps) {
      this.addFinding('low', 'infrastructure',
        'Dependências de Segurança',
        'Bibliotecas de segurança estão instaladas',
        'Manter dependências atualizadas',
        'pass'
      );
    }
  }

  auditCodeQuality() {
    console.log('💻 Auditando Qualidade do Código...');

    // Verificar TypeScript
    if (fs.existsSync('tsconfig.json')) {
      this.addFinding('low', 'codeQuality',
        'TypeScript Configurado',
        'Projeto utiliza TypeScript para type safety',
        'Manter configurações strict do TypeScript',
        'pass'
      );
    }

    // Verificar estrutura de arquivos
    const hasProperStructure = fs.existsSync('client') && 
                              fs.existsSync('server') && 
                              fs.existsSync('shared');

    if (hasProperStructure) {
      this.addFinding('low', 'codeQuality',
        'Estrutura Organizada',
        'Projeto possui estrutura bem organizada',
        'Manter separação clara entre frontend e backend',
        'pass'
      );
    }
  }

  auditPrivacy() {
    console.log('🔒 Auditando Privacidade e LGPD...');

    const schemaFile = fs.readFileSync('shared/schema.ts', 'utf8');

    // Verificar campos de dados pessoais
    if (schemaFile.includes('email') && schemaFile.includes('phone')) {
      this.addFinding('medium', 'privacy',
        'Dados Pessoais Identificados',
        'Sistema coleta dados pessoais (email, telefone)',
        'Implementar política de privacidade e consentimento LGPD'
      );
    }

    // Verificar soft delete
    if (!schemaFile.includes('deletedAt') && !schemaFile.includes('isActive')) {
      this.addFinding('medium', 'privacy',
        'Exclusão de Dados',
        'Sistema pode não implementar soft delete',
        'Implementar soft delete para compliance com LGPD'
      );
    }

    // Verificar auditoria
    if (schemaFile.includes('createdAt') && schemaFile.includes('updatedAt')) {
      this.addFinding('low', 'privacy',
        'Auditoria de Dados',
        'Sistema possui timestamps de auditoria',
        'Expandir logs de auditoria para operações sensíveis',
        'pass'
      );
    }
  }

  generateScore() {
    const weights = {
      critical: -10,
      high: -5,
      medium: -2,
      low: -1,
      passed: 1
    };

    let score = 0;
    Object.keys(this.findings).forEach(severity => {
      score += this.findings[severity].length * weights[severity];
    });

    const maxScore = this.findings.passed.length;
    const percentage = Math.max(0, Math.min(100, ((score + maxScore) / (maxScore * 2)) * 100));

    return {
      rawScore: score,
      percentage: Math.round(percentage),
      level: this.getSecurityLevel(percentage)
    };
  }

  getSecurityLevel(percentage) {
    if (percentage >= 90) return 'EXCELENTE';
    if (percentage >= 80) return 'BOM';
    if (percentage >= 70) return 'ADEQUADO';
    if (percentage >= 60) return 'REGULAR';
    return 'CRÍTICO';
  }

  generateReport() {
    console.log('\n🔍 Gerando relatório de segurança...');

    const score = this.generateScore();
    
    const report = {
      metadata: {
        projectName: 'SempreCheioApp',
        auditDate: new Date().toISOString(),
        version: '2.0',
        auditor: 'Security Audit Script'
      },
      
      summary: {
        score: score.percentage,
        level: score.level,
        totalFindings: Object.values(this.findings).flat().length,
        criticalIssues: this.findings.critical.length,
        highIssues: this.findings.high.length,
        mediumIssues: this.findings.medium.length,
        lowIssues: this.findings.low.length,
        passedChecks: this.findings.passed.length
      },

      readinessForSale: {
        recommended: score.percentage >= 80,
        blockers: this.findings.critical.length === 0 && this.findings.high.length <= 2,
        priority_fixes: [
          ...this.findings.critical,
          ...this.findings.high.slice(0, 3)
        ]
      },

      findings: this.findings,

      recommendations: this.generateRecommendations(),

      compliance: {
        lgpd: score.percentage >= 70,
        commercialUse: score.percentage >= 80,
        enterpriseReady: score.percentage >= 90
      }
    };

    fs.writeFileSync(AUDIT_REPORT, JSON.stringify(report, null, 2));
    
    return report;
  }

  generateRecommendations() {
    const recommendations = [];

    if (this.findings.critical.length > 0) {
      recommendations.push({
        priority: 'CRÍTICA',
        action: 'Corrigir todas as vulnerabilidades críticas antes da venda',
        impact: 'Risco de segurança grave que pode comprometer todo o sistema'
      });
    }

    if (this.findings.high.length > 2) {
      recommendations.push({
        priority: 'ALTA',
        action: 'Resolver issues de alta prioridade',
        impact: 'Vulnerabilidades que podem ser exploradas por atacantes'
      });
    }

    recommendations.push({
      priority: 'MÉDIA',
      action: 'Implementar rate limiting e headers de segurança',
      impact: 'Melhorar a postura de segurança geral da aplicação'
    });

    recommendations.push({
      priority: 'BAIXA',
      action: 'Documentar políticas de privacidade e segurança',
      impact: 'Compliance legal e transparência para clientes'
    });

    return recommendations;
  }

  async runAudit() {
    console.log('🔒 Iniciando Auditoria de Segurança - SempreCheioApp\n');

    this.auditAuthentication();
    this.auditDataProtection();
    this.auditApiSecurity();
    this.auditInfrastructure();
    this.auditCodeQuality();
    this.auditPrivacy();

    const report = this.generateReport();
    
    console.log('\n📊 RESUMO DA AUDITORIA');
    console.log('====================');
    console.log(`Score de Segurança: ${report.summary.score}% (${report.summary.level})`);
    console.log(`Issues Críticas: ${report.summary.criticalIssues}`);
    console.log(`Issues Altas: ${report.summary.highIssues}`);
    console.log(`Issues Médias: ${report.summary.mediumIssues}`);
    console.log(`Verificações Aprovadas: ${report.summary.passedChecks}`);
    
    console.log('\n🎯 PRONTO PARA VENDA?');
    console.log('====================');
    console.log(`Recomendado: ${report.readinessForSale.recommended ? 'SIM' : 'NÃO'}`);
    console.log(`Sem Bloqueadores: ${report.readinessForSale.blockers ? 'SIM' : 'NÃO'}`);
    console.log(`LGPD Compliance: ${report.compliance.lgpd ? 'SIM' : 'NÃO'}`);
    console.log(`Uso Comercial: ${report.compliance.commercialUse ? 'SIM' : 'NÃO'}`);
    
    console.log(`\n📋 Relatório completo salvo em: ${AUDIT_REPORT}`);
    
    return report;
  }
}

const auditor = new SecurityAuditor();
auditor.runAudit().catch(console.error);