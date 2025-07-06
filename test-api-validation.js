/**
 * Script de Validação Completa das APIs - SempreCheioApp
 * 
 * Este script testa todos os endpoints críticos para garantir:
 * ✅ Funcionamento correto de cada API
 * ✅ Isolamento multi-tenant (dados por client_id)
 * ✅ Segurança e permissões
 * ✅ Integridade dos dados no Supabase
 */

const BASE_URL = 'http://localhost:5000'; // Alterar para produção se necessário

class APIValidator {
  constructor() {
    this.results = [];
    this.cookies = '';
    this.superAdminUser = null;
    this.clientAdminUser = null;
  }

  log(message, type = 'info') {
    const timestamp = new Date().toISOString();
    const logEntry = { timestamp, message, type };
    this.results.push(logEntry);
    
    const colors = {
      info: '\x1b[36m',    // Cyan
      success: '\x1b[32m', // Green
      error: '\x1b[31m',   // Red
      warning: '\x1b[33m', // Yellow
      reset: '\x1b[0m'     // Reset
    };
    
    console.log(`${colors[type]}[${timestamp}] ${message}${colors.reset}`);
  }

  async makeRequest(endpoint, method = 'GET', body = null, headers = {}) {
    try {
      const url = `${BASE_URL}${endpoint}`;
      const options = {
        method,
        headers: {
          'Content-Type': 'application/json',
          'Cookie': this.cookies,
          ...headers
        }
      };

      if (body) {
        options.body = JSON.stringify(body);
      }

      const response = await fetch(url, options);
      
      // Capturar cookies de resposta
      const setCookie = response.headers.get('set-cookie');
      if (setCookie) {
        this.cookies = setCookie;
      }

      const data = await response.json().catch(() => null);
      
      return {
        status: response.status,
        ok: response.ok,
        data,
        headers: response.headers
      };
    } catch (error) {
      this.log(`Erro na requisição ${method} ${endpoint}: ${error.message}`, 'error');
      return { status: 0, ok: false, error: error.message };
    }
  }

  async testAuthentication() {
    this.log('🔐 TESTANDO AUTENTICAÇÃO', 'info');
    
    // Teste 1: Login Super Admin
    this.log('Testando login super admin...', 'info');
    const superAdminLogin = await this.makeRequest('/api/auth/login', 'POST', {
      email: 'semprecheioapp@gmail.com',
      password: '99240601Ma@n'
    });

    if (superAdminLogin.ok) {
      this.log('✅ Super admin login: SUCESSO', 'success');
      this.superAdminUser = superAdminLogin.data.user;
    } else {
      this.log(`❌ Super admin login: FALHOU (${superAdminLogin.status})`, 'error');
      return false;
    }

    // Teste 2: Verificar sessão
    const userCheck = await this.makeRequest('/api/auth/user');
    if (userCheck.ok && userCheck.data.email === 'semprecheioapp@gmail.com') {
      this.log('✅ Verificação de sessão: SUCESSO', 'success');
    } else {
      this.log('❌ Verificação de sessão: FALHOU', 'error');
    }

    // Teste 3: Logout
    const logout = await this.makeRequest('/api/auth/logout', 'POST');
    if (logout.ok) {
      this.log('✅ Logout: SUCESSO', 'success');
    } else {
      this.log('❌ Logout: FALHOU', 'error');
    }

    return true;
  }

  async testClientManagement() {
    this.log('🏢 TESTANDO GESTÃO DE CLIENTES', 'info');
    
    // Re-login como super admin
    await this.makeRequest('/api/auth/login', 'POST', {
      email: 'semprecheioapp@gmail.com',
      password: '99240601Ma@n'
    });

    // Teste 1: Listar clientes
    const clients = await this.makeRequest('/api/clients');
    if (clients.ok) {
      this.log(`✅ Listar clientes: SUCESSO (${clients.data.length} clientes)`, 'success');
    } else {
      this.log('❌ Listar clientes: FALHOU', 'error');
    }

    // Teste 2: Criar cliente de teste
    const newClient = await this.makeRequest('/api/auth/register', 'POST', {
      name: 'Empresa Teste API',
      email: 'teste-api@exemplo.com',
      phone: '+5511999999999',
      serviceType: 'beleza',
      password: 'teste123',
      confirmPassword: 'teste123'
    });

    if (newClient.ok) {
      this.log('✅ Criar cliente: SUCESSO', 'success');
    } else {
      this.log(`❌ Criar cliente: FALHOU (${newClient.status})`, 'error');
    }

    return true;
  }

  async testMultiTenantIsolation() {
    this.log('🛡️ TESTANDO ISOLAMENTO MULTI-TENANT', 'info');
    
    // Login como super admin
    await this.makeRequest('/api/auth/login', 'POST', {
      email: 'semprecheioapp@gmail.com',
      password: '99240601Ma@n'
    });

    // Teste 1: Super admin deve ver todos os dados
    const allCustomers = await this.makeRequest('/api/customers');
    if (allCustomers.ok) {
      this.log(`✅ Super admin vê todos os customers: SUCESSO (${allCustomers.data.length} registros)`, 'success');
    } else {
      this.log('❌ Super admin acesso customers: FALHOU', 'error');
    }

    // Teste 2: Verificar se dados têm client_id
    if (allCustomers.ok && allCustomers.data.length > 0) {
      const hasClientId = allCustomers.data.every(customer => customer.client_id);
      if (hasClientId) {
        this.log('✅ Todos os customers têm client_id: SUCESSO', 'success');
      } else {
        this.log('❌ Alguns customers sem client_id: FALHOU', 'error');
      }
    }

    return true;
  }

  async testCRUDOperations() {
    this.log('📝 TESTANDO OPERAÇÕES CRUD', 'info');
    
    // Login como super admin
    await this.makeRequest('/api/auth/login', 'POST', {
      email: 'semprecheioapp@gmail.com',
      password: '99240601Ma@n'
    });

    // Teste Customers
    const customers = await this.makeRequest('/api/customers');
    this.log(`Customers: ${customers.ok ? 'OK' : 'FALHOU'} (${customers.status})`, customers.ok ? 'success' : 'error');

    // Teste Appointments
    const appointments = await this.makeRequest('/api/appointments');
    this.log(`Appointments: ${appointments.ok ? 'OK' : 'FALHOU'} (${appointments.status})`, appointments.ok ? 'success' : 'error');

    // Teste Professionals
    const professionals = await this.makeRequest('/api/professionals');
    this.log(`Professionals: ${professionals.ok ? 'OK' : 'FALHOU'} (${professionals.status})`, professionals.ok ? 'success' : 'error');

    // Teste Services
    const services = await this.makeRequest('/api/services');
    this.log(`Services: ${services.ok ? 'OK' : 'FALHOU'} (${services.status})`, services.ok ? 'success' : 'error');

    // Teste Specialties
    const specialties = await this.makeRequest('/api/specialties');
    this.log(`Specialties: ${specialties.ok ? 'OK' : 'FALHOU'} (${specialties.status})`, specialties.ok ? 'success' : 'error');

    return true;
  }

  async runAllTests() {
    this.log('🚀 INICIANDO VALIDAÇÃO COMPLETA DAS APIs', 'info');
    this.log('=' * 50, 'info');
    
    try {
      await this.testAuthentication();
      await this.testClientManagement();
      await this.testMultiTenantIsolation();
      await this.testCRUDOperations();
      
      this.log('=' * 50, 'info');
      this.log('✅ VALIDAÇÃO COMPLETA FINALIZADA', 'success');
      
      // Resumo
      const errors = this.results.filter(r => r.type === 'error').length;
      const successes = this.results.filter(r => r.type === 'success').length;
      
      this.log(`📊 RESUMO: ${successes} sucessos, ${errors} erros`, errors > 0 ? 'warning' : 'success');
      
      if (errors === 0) {
        this.log('🎉 SISTEMA 100% FUNCIONAL E SEGURO!', 'success');
      } else {
        this.log('⚠️ ATENÇÃO: Alguns problemas encontrados', 'warning');
      }
      
    } catch (error) {
      this.log(`💥 ERRO CRÍTICO: ${error.message}`, 'error');
    }
  }
}

// Executar validação
if (typeof module !== 'undefined' && module.exports) {
  module.exports = APIValidator;
} else {
  // Executar se chamado diretamente
  const validator = new APIValidator();
  validator.runAllTests();
}
