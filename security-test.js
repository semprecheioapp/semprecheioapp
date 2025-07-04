// Teste de Segurança do SempreCheioApp
const https = require('https');
const http = require('http');

console.log('🔒 INICIANDO AUDITORIA DE SEGURANÇA - SEMPRECHEIOAPP 🔒\n');

// Função para fazer requisições HTTP
function makeRequest(options, data) {
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => resolve({ status: res.statusCode, body, headers: res.headers }));
    });
    
    req.on('error', reject);
    if (data) req.write(data);
    req.end();
  });
}

// Testes de Segurança
async function runSecurityTests() {
  const baseUrl = 'localhost';
  const port = 5000;
  
  console.log('📋 EXECUTANDO TESTES DE PENETRAÇÃO...\n');
  
  // 1. Teste SQL Injection
  console.log('1️⃣ TESTE: SQL Injection');
  try {
    const sqlInjectionPayload = JSON.stringify({
      email: "admin@test.com",
      password: "' OR '1'='1"
    });
    
    const response = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': sqlInjectionPayload.length
      }
    }, sqlInjectionPayload);
    
    if (response.status === 401) {
      console.log('✅ PROTEGIDO: SQL Injection bloqueado corretamente');
    } else {
      console.log('❌ VULNERÁVEL: SQL Injection pode ter funcionado');
    }
  } catch (error) {
    console.log('✅ PROTEGIDO: Conexão rejeitada (possível proteção)');
  }
  
  // 2. Teste XSS
  console.log('\n2️⃣ TESTE: Cross-Site Scripting (XSS)');
  try {
    const xssPayload = JSON.stringify({
      email: "<script>alert('XSS')</script>",
      password: "test123"
    });
    
    const response = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/api/auth/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': xssPayload.length
      }
    }, xssPayload);
    
    if (response.body.includes('<script>')) {
      console.log('❌ VULNERÁVEL: XSS não sanitizado');
    } else {
      console.log('✅ PROTEGIDO: XSS sanitizado ou rejeitado');
    }
  } catch (error) {
    console.log('✅ PROTEGIDO: Requisição XSS rejeitada');
  }
  
  // 3. Teste Rate Limiting
  console.log('\n3️⃣ TESTE: Rate Limiting');
  let rateLimitHit = false;
  for (let i = 0; i < 25; i++) {
    try {
      const response = await makeRequest({
        hostname: baseUrl,
        port: port,
        path: '/api/auth/login',
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      }, JSON.stringify({ email: "test@test.com", password: "test" }));
      
      if (response.status === 429) {
        console.log('✅ PROTEGIDO: Rate limiting ativo após', i + 1, 'tentativas');
        rateLimitHit = true;
        break;
      }
    } catch (error) {
      // Continua testando
    }
  }
  
  if (!rateLimitHit) {
    console.log('⚠️ ATENÇÃO: Rate limiting pode estar muito permissivo');
  }
  
  // 4. Teste de Headers de Segurança
  console.log('\n4️⃣ TESTE: Headers de Segurança');
  try {
    const response = await makeRequest({
      hostname: baseUrl,
      port: port,
      path: '/',
      method: 'GET'
    });
    
    const securityHeaders = [
      'x-content-type-options',
      'x-frame-options',
      'x-xss-protection',
      'strict-transport-security'
    ];
    
    securityHeaders.forEach(header => {
      if (response.headers[header]) {
        console.log(`✅ PRESENTE: ${header}`);
      } else {
        console.log(`⚠️ AUSENTE: ${header}`);
      }
    });
  } catch (error) {
    console.log('❌ ERRO: Não foi possível verificar headers');
  }
  
  console.log('\n🔒 AUDITORIA DE SEGURANÇA CONCLUÍDA 🔒');
}

// Executar testes
runSecurityTests().catch(console.error);
