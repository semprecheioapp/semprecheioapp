import fetch from 'node-fetch';

// Configurações do Asaas
const ASAAS_API_URL = process.env.ASAAS_API_URL || 'https://sandbox.asaas.com/api/v3';
const ASAAS_API_KEY = process.env.ASAAS_API_KEY || '';

interface AsaasCustomer {
  id?: string;
  name: string;
  email: string;
  phone?: string;
  mobilePhone?: string;
  cpfCnpj: string;
  postalCode?: string;
  address?: string;
  addressNumber?: string;
  complement?: string;
  province?: string;
  city?: string;
  state?: string;
  country?: string;
  observations?: string;
}

interface AsaasCharge {
  id?: string;
  customer: string; // ID do cliente
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED';
  value: number;
  dueDate: string; // YYYY-MM-DD
  description?: string;
  externalReference?: string;
  installmentCount?: number;
  installmentValue?: number;
  discount?: {
    value: number;
    dueDateLimitDays: number;
  };
  interest?: {
    value: number;
  };
  fine?: {
    value: number;
  };
  postalService?: boolean;
}

interface AsaasSubscription {
  id?: string;
  customer: string; // ID do cliente
  billingType: 'BOLETO' | 'CREDIT_CARD' | 'PIX';
  value: number;
  nextDueDate: string; // YYYY-MM-DD
  cycle: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'QUARTERLY' | 'SEMIANNUALLY' | 'YEARLY';
  description?: string;
  endDate?: string;
  maxPayments?: number;
  externalReference?: string;
  split?: Array<{
    walletId: string;
    fixedValue?: number;
    percentualValue?: number;
  }>;
}

class AsaasService {
  private apiKey: string;
  private baseUrl: string;

  constructor() {
    this.apiKey = ASAAS_API_KEY;
    this.baseUrl = ASAAS_API_URL;
  }

  private async makeRequest(endpoint: string, method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET', data?: any) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const options: any = {
      method,
      headers: {
        'Content-Type': 'application/json',
        'access_token': this.apiKey,
      },
    };

    if (data && (method === 'POST' || method === 'PUT')) {
      options.body = JSON.stringify(data);
    }

    try {
      const response = await fetch(url, options);
      const result = await response.json();

      if (!response.ok) {
        console.error('Asaas API Error:', result);
        throw new Error(`Asaas API Error: ${result.errors?.[0]?.description || response.statusText}`);
      }

      return result;
    } catch (error) {
      console.error('Error making request to Asaas:', error);
      throw error;
    }
  }

  // Gerenciamento de Clientes
  async createCustomer(customerData: AsaasCustomer): Promise<AsaasCustomer> {
    return this.makeRequest('/customers', 'POST', customerData);
  }

  async getCustomer(customerId: string): Promise<AsaasCustomer> {
    return this.makeRequest(`/customers/${customerId}`);
  }

  async updateCustomer(customerId: string, customerData: Partial<AsaasCustomer>): Promise<AsaasCustomer> {
    return this.makeRequest(`/customers/${customerId}`, 'PUT', customerData);
  }

  async deleteCustomer(customerId: string): Promise<void> {
    return this.makeRequest(`/customers/${customerId}`, 'DELETE');
  }

  async listCustomers(offset: number = 0, limit: number = 100): Promise<{ data: AsaasCustomer[]; hasMore: boolean }> {
    return this.makeRequest(`/customers?offset=${offset}&limit=${limit}`);
  }

  // Gerenciamento de Cobranças
  async createCharge(chargeData: AsaasCharge): Promise<any> {
    return this.makeRequest('/payments', 'POST', chargeData);
  }

  async getCharge(chargeId: string): Promise<any> {
    return this.makeRequest(`/payments/${chargeId}`);
  }

  async updateCharge(chargeId: string, chargeData: Partial<AsaasCharge>): Promise<any> {
    return this.makeRequest(`/payments/${chargeId}`, 'PUT', chargeData);
  }

  async deleteCharge(chargeId: string): Promise<void> {
    return this.makeRequest(`/payments/${chargeId}`, 'DELETE');
  }

  async listCharges(customerId?: string, offset: number = 0, limit: number = 100): Promise<{ data: any[]; hasMore: boolean }> {
    let url = `/payments?offset=${offset}&limit=${limit}`;
    if (customerId) {
      url += `&customer=${customerId}`;
    }
    return this.makeRequest(url);
  }

  // Gerenciamento de Assinaturas
  async createSubscription(subscriptionData: AsaasSubscription): Promise<any> {
    return this.makeRequest('/subscriptions', 'POST', subscriptionData);
  }

  async getSubscription(subscriptionId: string): Promise<any> {
    return this.makeRequest(`/subscriptions/${subscriptionId}`);
  }

  async updateSubscription(subscriptionId: string, subscriptionData: Partial<AsaasSubscription>): Promise<any> {
    return this.makeRequest(`/subscriptions/${subscriptionId}`, 'PUT', subscriptionData);
  }

  async deleteSubscription(subscriptionId: string): Promise<void> {
    return this.makeRequest(`/subscriptions/${subscriptionId}`, 'DELETE');
  }

  async listSubscriptions(customerId?: string, offset: number = 0, limit: number = 100): Promise<{ data: any[]; hasMore: boolean }> {
    let url = `/subscriptions?offset=${offset}&limit=${limit}`;
    if (customerId) {
      url += `&customer=${customerId}`;
    }
    return this.makeRequest(url);
  }

  // Webhooks
  async createWebhook(url: string, events: string[]): Promise<any> {
    return this.makeRequest('/webhooks', 'POST', {
      url,
      events,
      enabled: true,
      interrupted: false,
      authToken: process.env.ASAAS_WEBHOOK_TOKEN || 'semprecheio_webhook_token'
    });
  }

  async listWebhooks(): Promise<{ data: any[] }> {
    return this.makeRequest('/webhooks');
  }

  // Métodos utilitários
  async getBalance(): Promise<any> {
    return this.makeRequest('/finance/balance');
  }

  async getAccountInfo(): Promise<any> {
    return this.makeRequest('/myAccount');
  }

  // Validar webhook
  validateWebhook(payload: any, signature: string): boolean {
    // Implementar validação de assinatura do webhook
    // Por enquanto, retorna true (implementar validação real em produção)
    return true;
  }

  // Gerar link de pagamento
  async generatePaymentLink(chargeId: string): Promise<string> {
    const charge = await this.getCharge(chargeId);
    return charge.invoiceUrl || '';
  }

  // Processar pagamento com cartão de crédito
  async processCardPayment(chargeId: string, cardData: {
    holderName: string;
    number: string;
    expiryMonth: string;
    expiryYear: string;
    ccv: string;
  }): Promise<any> {
    return this.makeRequest(`/payments/${chargeId}/payWithCreditCard`, 'POST', {
      creditCard: cardData,
      creditCardHolderInfo: {
        name: cardData.holderName,
        email: '', // Será preenchido com o email do cliente
        cpfCnpj: '', // Será preenchido com o CPF/CNPJ do cliente
        postalCode: '',
        addressNumber: '',
        phone: ''
      }
    });
  }

  // Gerar PIX
  async generatePixPayment(chargeId: string): Promise<{ qrCode: string; copyPaste: string }> {
    const result = await this.makeRequest(`/payments/${chargeId}/pixQrCode`, 'GET');
    return {
      qrCode: result.encodedImage,
      copyPaste: result.payload
    };
  }

  // Confirmar pagamento em dinheiro
  async confirmCashPayment(chargeId: string, paymentDate?: string): Promise<any> {
    return this.makeRequest(`/payments/${chargeId}/receiveInCash`, 'POST', {
      paymentDate: paymentDate || new Date().toISOString().split('T')[0]
    });
  }

  // Estornar pagamento
  async refundPayment(chargeId: string, value?: number, description?: string): Promise<any> {
    const data: any = {};
    if (value) data.value = value;
    if (description) data.description = description;
    
    return this.makeRequest(`/payments/${chargeId}/refund`, 'POST', data);
  }
}

// Instância global do serviço Asaas
export const asaasService = new AsaasService();

// Tipos para exportação
export type { AsaasCustomer, AsaasCharge, AsaasSubscription };
