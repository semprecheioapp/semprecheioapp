import { storage } from "../storage-clients-auth";
import { ApiError } from "../middleware/error-handler";
import { z } from "zod";

// Função para processar número de telefone
function processPhoneNumber(phoneNumber: string): string {
  if (!phoneNumber) return phoneNumber;
  
  // Remove todos os caracteres não numéricos
  let cleanPhone = phoneNumber.replace(/\D/g, '');
  
  // Se começar com +, remove o +
  if (phoneNumber.startsWith('+')) {
    cleanPhone = phoneNumber.substring(1).replace(/\D/g, '');
  }
  
  // Verifica se é um número brasileiro (código 55)
  if (cleanPhone.startsWith('55')) {
    const countryCode = '55';
    const localNumber = cleanPhone.substring(2);
    
    // Verifica se é um celular brasileiro (11 dígitos após o código do país)
    // e se tem o nono dígito (9 no início do número do celular)
    if (localNumber.length === 11) {
      const areaCode = localNumber.substring(0, 2);
      const phoneDigits = localNumber.substring(2);
      
      // Verifica se é celular (começa com 9) e remove o nono dígito
      if (phoneDigits.startsWith('9') && phoneDigits.length === 9) {
        const phoneWithoutNinth = phoneDigits.substring(1);
        return countryCode + areaCode + phoneWithoutNinth;
      }
    }
  }
  
  // Para outros países ou números que não se encaixam na regra, retorna como está
  return cleanPhone;
}

export class ClientService {
  // Schema de validação para registro de cliente
  private static clientRegisterSchema = z.object({
    name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
    email: z.string().email("E-mail inválido"),
    phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
    serviceType: z.string().min(1, "Selecione o tipo de serviço"),
    customServiceType: z.string().optional(),
    password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
    confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
  });

  static async registerClient(data: any) {
    // Validar dados de entrada
    const result = this.clientRegisterSchema.safeParse(data);
    
    if (!result.success) {
      throw new ApiError("Dados inválidos", 400);
    }
    
    const { name, email, phone, serviceType, customServiceType, password } = result.data;
    
    // Process phone number (remove 9th digit for Brazil, format correctly)
    const processedPhone = processPhoneNumber(phone);
    
    // Use custom service type if "outro" was selected
    const finalServiceType = serviceType === "outro" ? customServiceType : serviceType;
    
    // Check if client already exists
    const existingClient = await storage.getClientByEmail(email);
    if (existingClient) {
      throw new ApiError("Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail.", 409);
    }
    
    // Create new client company
    const newClient = await storage.createClient({
      name,
      email,
      phone: processedPhone,
      serviceType: finalServiceType,
      password,
      isActive: true,
    });
    
    // Send data to external webhook (parallel operation)
    this.sendWebhookNotification(name, processedPhone, finalServiceType);
    
    // Return success without password
    const { password: _, ...clientWithoutPassword } = newClient;
    return clientWithoutPassword;
  }

  private static async sendWebhookNotification(name: string, phone: string, serviceType: string) {
    try {
      const webhookUrl = "https://wb.semprecheioapp.com.br/webhook/super_admin_creat_clients";
      
      const webhookData = {
        empresa_nome: name,
        telefone: phone,
        tipo_servico: serviceType,
        timestamp: new Date().toISOString(),
        source: "semprecheioapp_cadastro"
      };
      
      // Send to webhook asynchronously (don't wait for response)
      fetch(webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(webhookData)
      }).catch(error => {
        console.log("Webhook notification failed (non-critical):", error.message);
      });
      
    } catch (webhookError) {
      // Webhook failure should not affect user registration
      console.log("Webhook error (non-critical):", webhookError);
    }
  }

  static async listClients() {
    return await storage.listClients();
  }

  static async createClient(data: any) {
    return await storage.createClient(data);
  }

  static async updateClient(id: string, data: any) {
    const client = await storage.updateClient(id, data);
    if (!client) {
      throw new ApiError("Cliente não encontrado", 404);
    }
    return client;
  }

  static async deleteClient(id: string) {
    await storage.deleteClient(id);
  }

  static async getClientUsageStats(clientId: string, filters: any = {}) {
    const { professionalId, startDate, endDate, period } = filters;

    // Buscar dados reais da empresa
    const professionals = await storage.listProfessionalsByClient(clientId);
    const customers = await storage.listCustomers(clientId);
    const services = await storage.listServicesByClient(clientId);
    let appointments = await storage.listAppointments({ clientId });

    // Calcular período de análise
    let periodStartDate: Date;
    let periodEndDate: Date;

    if (period === 'week') {
      const now = new Date();
      const dayOfWeek = now.getDay();
      periodStartDate = new Date(now);
      periodStartDate.setDate(now.getDate() - dayOfWeek);
      periodStartDate.setHours(0, 0, 0, 0);

      periodEndDate = new Date(periodStartDate);
      periodEndDate.setDate(periodStartDate.getDate() + 6);
      periodEndDate.setHours(23, 59, 59, 999);
    } else if (period === 'month') {
      const now = new Date();
      periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    } else if (startDate && endDate) {
      periodStartDate = new Date(startDate);
      periodStartDate.setHours(0, 0, 0, 0);
      periodEndDate = new Date(endDate);
      periodEndDate.setHours(23, 59, 59, 999);
    } else {
      const now = new Date();
      periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
      periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    }

    // Filtrar agendamentos por período
    appointments = appointments.filter(apt => {
      const appointmentDate = new Date(apt.scheduledAt || apt.createdAt);
      return appointmentDate >= periodStartDate && appointmentDate <= periodEndDate;
    });

    // Filtrar agendamentos por profissional se especificado
    if (professionalId && professionalId !== 'all') {
      appointments = appointments.filter(apt => apt.professionalId === professionalId);
    }

    // Calcular métricas
    const totalProfessionals = professionalId && professionalId !== 'all' ? 1 : professionals.length;
    const totalCustomers = customers.length;
    const totalServices = services.length;
    const totalAppointments = appointments.length;

    const completedAppointments = appointments.filter(a =>
      a.status === 'completed' || a.status === 'confirmed' || a.status === 'confirmado'
    ).length;

    // Calcular receita baseada nos preços reais dos serviços
    let grossRevenue = 0;
    for (const appointment of appointments) {
      if (appointment.status === 'completed' || appointment.status === 'confirmed' || appointment.status === 'confirmado') {
        const service = services.find(s => s.id === appointment.serviceId);
        const servicePriceInCents = service?.price || 15000;
        const servicePrice = servicePriceInCents / 100;
        grossRevenue += servicePrice;
      }
    }

    const platformCommission = grossRevenue * 0.1;
    const netRevenue = grossRevenue - platformCommission;
    const averageTicket = completedAppointments > 0 ? grossRevenue / completedAppointments : 0;
    const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

    // Buscar informações do profissional selecionado
    let selectedProfessional = null;
    if (professionalId && professionalId !== 'all') {
      selectedProfessional = professionals.find(p => p.id === professionalId);
    }

    return {
      grossRevenue,
      netRevenue,
      monthlyRevenue: grossRevenue,
      platformCommission,
      averageTicket,
      conversionRate,
      totalProfessionals,
      totalCustomers,
      totalServices,
      totalAppointments,
      completedAppointments,
      monthlyAppointments: totalAppointments,
      period: {
        type: period || 'month',
        startDate: periodStartDate.toISOString(),
        endDate: periodEndDate.toISOString(),
        label: period === 'week' ? 'Semana Atual' :
               period === 'month' ? 'Mês Atual' :
               startDate && endDate ? `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}` :
               'Mês Atual'
      },
      filter: {
        professionalId: professionalId || 'all',
        professionalName: selectedProfessional?.name || 'Todos os Profissionais',
        isFiltered: !!professionalId && professionalId !== 'all',
        professionalDetails: selectedProfessional ? {
          id: selectedProfessional.id,
          name: selectedProfessional.name,
          email: selectedProfessional.email,
          specialtyName: (selectedProfessional as any).specialtyName || 'Sem especialidade',
          totalAppointments: appointments.length,
          completedAppointments: completedAppointments,
          grossRevenue: grossRevenue,
          periodRevenue: grossRevenue,
          averageTicket: completedAppointments > 0 ? grossRevenue / completedAppointments : 0
        } : null
      },
      availableProfessionals: professionals.map(p => ({
        id: p.id,
        name: p.name,
        specialtyName: (p as any).specialtyName || 'Sem especialidade'
      }))
    };
  }
}
