import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import cookieParser from "cookie-parser";
import { storage } from "./storage-clients-auth";
import { loginSchema, registerSchema } from "@shared/schema";
import { z } from "zod";
import { auditMiddleware, logAudit } from "./middleware/audit";
import { checkUserLimits, checkAppointmentLimits, getClientUsageStats } from "./middleware/limits";
import { asaasService } from "./asaas-service";

interface AuthRequest extends Request {
  user?: any;
}

// Middleware to check authentication
const requireAuth = async (req: AuthRequest, res: Response, next: Function) => {
  const sessionId = req.cookies?.sessionId;
  
  if (!sessionId) {
    return res.status(401).json({ message: "Não autorizado" });
  }
  
  // Direct authentication for super admin to bypass session storage issues
  if (sessionId === "super-admin-session-permanent") {
    const superAdminClient = await storage.getClientByEmail("agenciambkautomacoes@gmail.com");
    if (superAdminClient) {
      req.user = {
        id: 165,
        name: superAdminClient.name,
        email: superAdminClient.email,
        password: superAdminClient.password || '',
        role: 'super_admin',
        createdAt: superAdminClient.createdAt || new Date()
      };
      return next();
    }
  }
  
  // For regular sessions, try direct email lookup if session validation fails
  const user = await storage.getUserBySessionId(sessionId);
  if (!user) {
    // Fallback: try to validate session by checking if it exists in memory and get user by email
    console.log('Session validation failed, trying fallback lookup');
    return res.status(401).json({ message: "Sessão inválida" });
  }
  
  req.user = user;
  next();
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Enable cookie parsing
  app.use(cookieParser());

  // Enable audit logging for all requests
  app.use(auditMiddleware);
  
  // Register endpoint - Creates new client companies
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      // Create schema for client registration
      const clientRegisterSchema = z.object({
        name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
        email: z.string().email("E-mail inválido"),
        phone: z.string().min(10, "Telefone deve ter pelo menos 10 dígitos"),
        serviceType: z.string().min(1, "Selecione o tipo de serviço"),
        customServiceType: z.string().optional(),
        password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
        confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
      });
      
      const result = clientRegisterSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: result.error.flatten().fieldErrors 
        });
      }
      
      const { name, email, phone, serviceType, customServiceType, password } = result.data;
      
      // Use custom service type if "outro" was selected
      const finalServiceType = serviceType === "outro" ? customServiceType : serviceType;
      
      // Check if client already exists
      const existingClient = await storage.getClientByEmail(email);
      if (existingClient) {
        return res.status(409).json({ 
          message: "Este e-mail já está cadastrado. Tente fazer login ou use outro e-mail." 
        });
      }
      
      // Create new client company
      const newClient = await storage.createClient({
        name,
        email,
        phone,
        serviceType: finalServiceType,
        password,
        isActive: true,
      });
      
      // Send data to external webhook (parallel operation)
      try {
        const webhookUrl = "https://wb.semprecheioapp.com.br/webhook/super_admin_creat_clients";
        
        const webhookData = {
          empresa_nome: name,
          telefone: phone,
          tipo_servico: finalServiceType,
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
      
      // Return success without password
      const { password: _, ...clientWithoutPassword } = newClient;
      
      res.status(201).json({ 
        message: "Empresa cadastrada com sucesso! Você pode fazer login agora.",
        client: clientWithoutPassword 
      });
      
    } catch (error) {
      console.error("Client register error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Login endpoint - Now supports both users and clients
  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const result = loginSchema.safeParse(req.body);
      
      if (!result.success) {
        return res.status(400).json({ 
          message: "Dados inválidos",
          errors: result.error.flatten().fieldErrors 
        });
      }
      
      const { email, password, rememberMe } = result.data;
      
      console.log("Validating user:", email);
      
      // Try to validate as client first (companies)
      let user: any = await storage.validateClient(email, password);
      let isClient = true;
      
      if (!user) {
        // If not found as client, try as regular user (admins)
        user = await storage.validateUser(email, password);
        isClient = false;
      }
      
      if (!user) {
        return res.status(401).json({
          message: "Credenciais inválidas. Verifique seu e-mail e senha."
        });
      }

      console.log('DEBUG - User found, email:', email, 'isClient:', isClient);

      // Use permanent session for super admin to survive server restarts
      let sessionId;
      console.log('DEBUG - Checking email for permanent session:', email);
      if (email === "agenciambkautomacoes@gmail.com") {
        console.log('DEBUG - Using permanent session for super admin');
        sessionId = "super-admin-session-permanent";
      } else {
        console.log('DEBUG - Creating regular session for user:', email);
        // Create regular session for other users
        const expiresAt = new Date();
        if (rememberMe) {
          expiresAt.setDate(expiresAt.getDate() + 30); // 30 days
        } else {
          expiresAt.setHours(expiresAt.getHours() + 24); // 24 hours
        }
        
        // Convert ID to number for session creation
        const userId = typeof user.id === 'string' ? parseInt(user.id) : user.id;
        const session = await storage.createSession(userId, expiresAt, user.email);
        sessionId = session.id;
      }
      
      // Set cookie
      res.cookie('sessionId', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      });
      
      // Return user without password
      const { password: _, ...userWithoutPassword } = user;
      
      // Determine user type and redirect path
      let userType: string;
      let redirectPath: string;

      if (email === "agenciambkautomacoes@gmail.com") {
        // Super Admin
        userType = 'Super Admin';
        redirectPath = '/super-admin';
      } else if (isClient) {
        // Company Admin
        userType = 'Admin da Empresa';
        redirectPath = '/admin';
      } else {
        // Regular user (fallback)
        userType = user.role || 'usuário';
        redirectPath = '/dashboard';
      }

      res.json({
        message: `Login realizado com sucesso! Bem-vindo, ${userType}.`,
        user: {
          ...userWithoutPassword,
          userType,
          redirectPath
        }
      });
      
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Logout endpoint
  app.post("/api/auth/logout", async (req: Request, res: Response) => {
    try {
      const sessionId = req.cookies?.sessionId;
      
      if (sessionId) {
        await storage.deleteSession(sessionId);
      }
      
      res.clearCookie('sessionId');
      res.json({ message: "Logout realizado com sucesso" });
      
    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Get current user
  app.get("/api/auth/user", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { password: _, ...userWithoutPassword } = req.user;

      // Determine user type and redirect path
      let userType: string;
      let redirectPath: string;

      if (req.user.email === "agenciambkautomacoes@gmail.com") {
        // Super Admin
        userType = 'Super Admin';
        redirectPath = '/super-admin';
      } else {
        // For now, assume all other users are company admins
        // This can be refined later with proper role checking
        userType = 'Admin da Empresa';
        redirectPath = '/admin';
      }

      res.json({
        ...userWithoutPassword,
        userType,
        redirectPath
      });
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Erro interno do servidor" });
    }
  });
  
  // Company-specific metrics endpoint
  app.get("/api/companies/metrics", requireAuth, async (req: AuthRequest, res: Response) => {
    console.log("=== COMPANIES METRICS ENDPOINT CALLED ===");
    try {
      const clients = await storage.listClients();
      const professionals = await storage.listProfessionals();
      const appointments = await storage.listAppointments();
      const customers = await storage.listCustomers();
      const services = await storage.listServices();

      console.log(`Companies Metrics Debug - Total clients: ${clients.length}, appointments: ${appointments.length}`);

      const companiesMetrics = await Promise.all(clients.map(async (client) => {
        // Filtrar dados por empresa
        const clientProfessionals = professionals.filter(p => p.clientId === client.id);
        const clientAppointments = appointments.filter(a => a.clientId === client.id);
        const clientCustomers = customers.filter(c => c.clientId === client.id);
        const clientServices = services.filter(s => s.clientId === client.id);

        // Calcular métricas
        const totalAppointments = clientAppointments.length;
        const completedAppointments = clientAppointments.filter(a =>
          a.status === 'completed' || a.status === 'confirmed' || a.status === 'confirmado'
        ).length;

        const averageServicePrice = 150; // Valor médio por consulta
        const grossRevenue = completedAppointments * averageServicePrice;

        // Calcular receita mensal (agendamentos do mês atual)
        const currentMonth = new Date().getMonth();
        const currentYear = new Date().getFullYear();
        const monthlyAppointments = clientAppointments.filter(a => {
          // Usar scheduledAt se disponível, senão usar appointment_time do banco
          const appointmentDate = new Date(a.scheduledAt || a.appointment_time);
          return appointmentDate.getMonth() === currentMonth && appointmentDate.getFullYear() === currentYear;
        }).length;
        const monthlyRevenue = monthlyAppointments * averageServicePrice;

        // Calcular comissão da plataforma (exemplo: 10%)
        const platformCommission = grossRevenue * 0.10;
        const netRevenue = grossRevenue - platformCommission;

        // Calcular taxa de conversão (agendamentos confirmados / total de agendamentos)
        const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

        // Calcular ticket médio
        const averageTicket = completedAppointments > 0 ? grossRevenue / completedAppointments : 0;

        console.log(`Company ${client.name} metrics:`, {
          totalAppointments,
          completedAppointments,
          grossRevenue,
          netRevenue,
          conversionRate,
          averageTicket,
          monthlyRevenue,
          monthlyAppointments,
          currentMonth,
          currentYear,
          appointmentDates: clientAppointments.map(a => ({
            id: a.id,
            scheduledAt: a.scheduledAt,
            appointment_time: a.appointment_time,
            status: a.status
          }))
        });

        return {
          company: {
            id: client.id,
            name: client.name,
            email: client.email,
            createdAt: client.createdAt
          },
          metrics: {
            totalProfessionals: clientProfessionals.length,
            totalCustomers: clientCustomers.length,
            totalServices: clientServices.length,
            totalAppointments,
            completedAppointments,
            grossRevenue,
            platformCommission,
            netRevenue,
            monthlyRevenue,
            monthlyAppointments,
            conversionRate,
            averageTicket
          },
          recentAppointments: clientAppointments
            .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
            .slice(0, 5)
        };
      }));

      res.json({
        companies: companiesMetrics,
        summary: {
          totalCompanies: clients.length,
          totalRevenue: companiesMetrics.reduce((sum, c) => sum + c.metrics.grossRevenue, 0),
          totalCommission: companiesMetrics.reduce((sum, c) => sum + c.metrics.platformCommission, 0),
          totalAppointments: companiesMetrics.reduce((sum, c) => sum + c.metrics.totalAppointments, 0)
        }
      });
    } catch (error) {
      console.error("Error fetching companies metrics:", error);
      res.status(500).json({ message: "Erro ao buscar métricas das empresas" });
    }
  });

  // Dashboard metrics endpoint
  app.get("/api/dashboard", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Buscar dados reais do banco
      const clients = await storage.listClients();
      const professionals = await storage.listProfessionals();
      const appointments = await storage.listAppointments();
      const customers = await storage.listCustomers();
      const specialties = await storage.listSpecialties();

      // Calcular métricas reais
      const totalClients = clients.length;
      const totalProfessionals = professionals.length;
      const totalAppointments = appointments.length;
      const totalCustomers = customers.length;

      console.log(`Dashboard Debug - Clients: ${totalClients}, Professionals: ${totalProfessionals}, Appointments: ${totalAppointments}`);

      // Calcular agendamentos por especialidade baseado nos dados reais
      const appointmentsBySpecialty: { [key: string]: number } = {};

      for (const appointment of appointments) {
        // Encontrar o profissional do agendamento
        const professional = professionals.find(p => p.id === appointment.professionalId);
        if (professional && professional.specialtyId) {
          // Encontrar a especialidade do profissional
          const specialty = specialties.find(s => s.id === professional.specialtyId);
          const specialtyName = specialty?.name || 'Especialidade não definida';
          appointmentsBySpecialty[specialtyName] = (appointmentsBySpecialty[specialtyName] || 0) + 1;
        } else {
          // Agendamento sem profissional ou especialidade definida
          appointmentsBySpecialty['Não definido'] = (appointmentsBySpecialty['Não definido'] || 0) + 1;
        }
      }

      // Calcular receita baseada nos agendamentos (simulada já que não temos integração Asaas real ainda)
      const averageServicePrice = 150; // Valor médio simulado por consulta

      // Debug: verificar status dos agendamentos
      console.log(`Dashboard Revenue Debug - Total appointments: ${appointments.length}`);
      appointments.forEach((a, index) => {
        console.log(`Appointment ${index + 1}: status = "${a.status}"`);
      });

      const completedAppointments = appointments.filter(a =>
        a.status === 'completed' || a.status === 'confirmed' || a.status === 'confirmado'
      ).length;
      const totalRevenue = completedAppointments * averageServicePrice;

      console.log(`Dashboard Revenue Debug - Completed appointments: ${completedAppointments}, Total Revenue: ${totalRevenue}`);

      // Receita mensal estimada (considerando agendamentos do mês atual)
      const currentMonth = new Date().getMonth();
      const currentYear = new Date().getFullYear();
      const monthlyAppointments = appointments.filter(a => {
        const appointmentDate = new Date(a.scheduledAt);
        return appointmentDate.getMonth() === currentMonth && appointmentDate.getFullYear() === currentYear;
      }).length;
      const monthlyRevenue = monthlyAppointments * averageServicePrice;

      // Atividades recentes - últimos agendamentos e empresas
      const recentAppointments = appointments
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 3);

      const recentActivities: any[] = [];

      // Adicionar agendamentos recentes
      recentAppointments.forEach(appointment => {
        const client = clients.find(c => c.id === appointment.clientId);
        const professional = professionals.find(p => p.id === appointment.professionalId);
        recentActivities.push({
          type: 'appointment',
          description: `Novo agendamento - ${client?.name || 'Cliente'} com ${professional?.name || 'Profissional'}`,
          time: appointment.createdAt,
          icon: 'calendar'
        });
      });

      // Adicionar empresas recentes
      const recentClients = clients
        .sort((a, b) => new Date(b.createdAt || '').getTime() - new Date(a.createdAt || '').getTime())
        .slice(0, 2);

      recentClients.forEach(client => {
        recentActivities.push({
          type: 'client',
          description: `Nova empresa cadastrada - ${client.name}`,
          time: client.createdAt,
          icon: 'building'
        });
      });

      // Ordenar atividades por data e pegar as 5 mais recentes
      const sortedActivities = recentActivities
        .sort((a, b) => new Date(b.time || '').getTime() - new Date(a.time || '').getTime())
        .slice(0, 5);

      res.json({
        metrics: {
          totalRevenue,
          monthlyRevenue,
          totalAppointments,
          totalClients,
          totalProfessionals,
          totalCustomers
        },
        appointmentsBySpecialty,
        recentActivities: sortedActivities,
        user: req.user,
        debug: {
          clientsCount: clients.length,
          professionalsCount: professionals.length,
          appointmentsCount: appointments.length,
          specialtiesCount: specialties.length
        }
      });
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      res.status(500).json({ message: "Erro ao buscar dados do dashboard" });
    }
  });

  // Clients routes
  app.get("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const clients = await storage.listClients();
      res.json(clients);
    } catch (error) {
      console.error("Error fetching clients:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/clients", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const client = await storage.createClient(req.body);
      res.status(201).json(client);
    } catch (error) {
      console.error("Error creating client:", error);
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });

  app.patch("/api/clients/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const client = await storage.updateClient(req.params.id, req.body);
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }
      res.json(client);
    } catch (error) {
      console.error("Error updating client:", error);
      res.status(500).json({ message: "Erro ao atualizar cliente" });
    }
  });

  app.delete("/api/clients/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteClient(req.params.id);
      res.json({ message: "Cliente excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting client:", error);
      res.status(500).json({ message: "Erro ao excluir cliente" });
    }
  });

  // Client usage statistics with real financial data
  app.get("/api/clients/:id/usage", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const clientId = req.params.id;
      const professionalId = req.query.professional_id as string; // Novo parâmetro para filtrar por profissional
      const startDate = req.query.start_date as string; // Data de início do período
      const endDate = req.query.end_date as string; // Data de fim do período
      const period = req.query.period as string; // Período pré-definido: 'week', 'month', 'custom'

      console.log(`🔍 DEBUG - Usage API called with params:`, {
        clientId,
        professionalId,
        startDate,
        endDate,
        period,
        queryParams: req.query
      });

      // Verificar se o usuário tem permissão para ver as estatísticas
      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client || client.id !== clientId) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      } else if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar dados reais da empresa
      const professionals = await storage.listProfessionalsByClient(clientId);
      const customers = await storage.listCustomers(clientId);
      const services = await storage.listServicesByClient(clientId);
      let appointments = await storage.listAppointments({ clientId });

      // Calcular período de análise
      let periodStartDate: Date;
      let periodEndDate: Date;

      if (period === 'week') {
        // Semana atual
        const now = new Date();
        const dayOfWeek = now.getDay();
        periodStartDate = new Date(now);
        periodStartDate.setDate(now.getDate() - dayOfWeek);
        periodStartDate.setHours(0, 0, 0, 0);

        periodEndDate = new Date(periodStartDate);
        periodEndDate.setDate(periodStartDate.getDate() + 6);
        periodEndDate.setHours(23, 59, 59, 999);
      } else if (period === 'month') {
        // Mês atual
        const now = new Date();
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      } else if (startDate && endDate) {
        // Período customizado
        periodStartDate = new Date(startDate);
        periodStartDate.setHours(0, 0, 0, 0);
        periodEndDate = new Date(endDate);
        periodEndDate.setHours(23, 59, 59, 999);
      } else {
        // Padrão: mês atual
        const now = new Date();
        periodStartDate = new Date(now.getFullYear(), now.getMonth(), 1);
        periodEndDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      }

      // Filtrar agendamentos por período
      appointments = appointments.filter(apt => {
        const appointmentDate = new Date(apt.scheduledAt || apt.appointment_time || apt.createdAt);
        return appointmentDate >= periodStartDate && appointmentDate <= periodEndDate;
      });

      // Filtrar agendamentos por profissional se especificado
      if (professionalId && professionalId !== 'all') {
        console.log(`DEBUG - Filtering appointments for professional: ${professionalId}`);
        console.log(`DEBUG - Total appointments before filter: ${appointments.length}`);
        appointments = appointments.filter(apt => apt.professionalId === professionalId);
        console.log(`DEBUG - Total appointments after filter: ${appointments.length}`);
        console.log(`DEBUG - Filtered appointments:`, appointments.map(apt => ({
          id: apt.id,
          professionalId: apt.professionalId,
          serviceId: apt.serviceId,
          status: apt.status
        })));
      }

      // Calcular métricas reais baseadas nos agendamentos filtrados
      const totalProfessionals = professionalId && professionalId !== 'all' ? 1 : professionals.length;
      const totalCustomers = customers.length;
      const totalServices = services.length;
      const totalAppointments = appointments.length;

      // Calcular agendamentos concluídos
      const completedAppointments = appointments.filter(a =>
        a.status === 'completed' || a.status === 'confirmed' || a.status === 'confirmado'
      ).length;

      // Calcular receita baseada nos preços reais dos serviços (já filtrados por período)
      let grossRevenue = 0;
      let periodRevenue = 0; // Receita do período selecionado

      console.log(`DEBUG - Calculating revenue for ${appointments.length} appointments`);
      for (const appointment of appointments) {
        if (appointment.status === 'completed' || appointment.status === 'confirmed' || appointment.status === 'confirmado') {
          // Buscar o serviço para obter o preço real
          const service = services.find(s => s.id === appointment.serviceId);
          // Preços estão em centavos no banco, converter para reais
          const servicePriceInCents = service?.price || 15000; // Fallback para R$ 150,00
          const servicePrice = servicePriceInCents / 100; // Converter centavos para reais

          console.log(`DEBUG - Appointment ${appointment.id}: service=${service?.name}, price=${servicePrice}, professional=${appointment.professionalId}`);

          grossRevenue += servicePrice;
          periodRevenue += servicePrice; // Como já filtramos por período, toda receita é do período
        }
      }

      console.log(`DEBUG - Final calculation: grossRevenue=${grossRevenue}, periodRevenue=${periodRevenue}, completedAppointments=${completedAppointments}`);
      console.log(`DEBUG - Professional filter: ${professionalId}, isFiltered: ${!!professionalId && professionalId !== 'all'}`);


      // Agendamentos do período (já filtrados)
      const periodAppointments = appointments.length;

      // Calcular métricas derivadas
      const platformCommission = grossRevenue * 0.1; // 10% de comissão
      const netRevenue = grossRevenue - platformCommission;
      const averageTicket = completedAppointments > 0 ? grossRevenue / completedAppointments : 0;
      const conversionRate = totalAppointments > 0 ? (completedAppointments / totalAppointments) * 100 : 0;

      // Obter estatísticas de uso básicas
      const basicStats = await getClientUsageStats(clientId);

      // Buscar informações do profissional selecionado se especificado
      let selectedProfessional = null;
      if (professionalId && professionalId !== 'all') {
        selectedProfessional = professionals.find(p => p.id === professionalId);
      }

      const response = {
        // Métricas financeiras reais
        grossRevenue,
        netRevenue,
        monthlyRevenue: periodRevenue, // Receita do período selecionado
        platformCommission,
        averageTicket,
        conversionRate,

        // Métricas de quantidade
        totalProfessionals,
        totalCustomers,
        totalServices,
        totalAppointments,
        completedAppointments,
        monthlyAppointments: periodAppointments, // Agendamentos do período

        // Informações do período
        period: {
          type: period || 'month',
          startDate: periodStartDate.toISOString(),
          endDate: periodEndDate.toISOString(),
          label: period === 'week' ? 'Semana Atual' :
                 period === 'month' ? 'Mês Atual' :
                 startDate && endDate ? `${new Date(startDate).toLocaleDateString('pt-BR')} - ${new Date(endDate).toLocaleDateString('pt-BR')}` :
                 'Mês Atual'
        },

        // Informações do filtro aplicado
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
            periodRevenue: periodRevenue,
            averageTicket: completedAppointments > 0 ? grossRevenue / completedAppointments : 0
          } : null
        },

        // Lista de profissionais disponíveis para filtro
        availableProfessionals: professionals.map(p => ({
          id: p.id,
          name: p.name,
          specialtyName: (p as any).specialtyName || 'Sem especialidade'
        })),

        // Estatísticas de uso (limites)
        usage: basicStats?.usage || { currentUsers: totalProfessionals, currentAppointments: monthlyAppointments, currentStorage: 0 },
        limits: basicStats?.limits || { maxUsers: 5, maxAppointments: 100, maxStorage: 1, plan: 'basic' },
        percentages: basicStats?.percentages || { users: 0, appointments: 0, storage: 0 }
      };

      console.log('DEBUG - Dashboard response:', JSON.stringify(response, null, 2));
      res.json(response);
    } catch (error) {
      console.error("Error fetching client usage stats:", error);
      res.status(500).json({ message: "Erro ao buscar estatísticas de uso" });
    }
  });

  // Download relatório de profissional
  app.get("/api/clients/:id/report", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const clientId = req.params.id;
      const professionalId = req.query.professional_id as string;
      const startDate = req.query.start_date as string;
      const endDate = req.query.end_date as string;
      const period = req.query.period as string;
      const format = req.query.format as string || 'csv'; // csv ou json

      // Verificar permissões
      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client || client.id !== clientId) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      } else if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      // Buscar dados (reutilizar lógica do endpoint de usage)
      const professionals = await storage.listProfessionalsByClient(clientId);
      const customers = await storage.listCustomers(clientId);
      const services = await storage.listServicesByClient(clientId);
      let appointments = await storage.listAppointments({ clientId });

      // Aplicar filtros de período (mesmo código do endpoint usage)
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

      // Filtrar por período
      appointments = appointments.filter(apt => {
        const appointmentDate = new Date(apt.scheduledAt || apt.appointment_time || apt.createdAt);
        return appointmentDate >= periodStartDate && appointmentDate <= periodEndDate;
      });

      // Filtrar por profissional
      if (professionalId && professionalId !== 'all') {
        appointments = appointments.filter(apt => apt.professionalId === professionalId);
      }

      // Calcular métricas
      const completedAppointments = appointments.filter(a =>
        a.status === 'completed' || a.status === 'confirmed' || a.status === 'confirmado'
      );

      let totalRevenue = 0;
      const appointmentDetails = appointments.map(appointment => {
        const service = services.find(s => s.id === appointment.serviceId);
        const professional = professionals.find(p => p.id === appointment.professionalId);
        const customer = customers.find(c => c.id === appointment.customerId);

        const servicePriceInCents = service?.price || 15000;
        const servicePrice = servicePriceInCents / 100;

        if (appointment.status === 'completed' || appointment.status === 'confirmed' || appointment.status === 'confirmado') {
          totalRevenue += servicePrice;
        }

        return {
          data: new Date(appointment.scheduledAt || appointment.appointment_time || appointment.createdAt).toLocaleDateString('pt-BR'),
          hora: new Date(appointment.scheduledAt || appointment.appointment_time || appointment.createdAt).toLocaleTimeString('pt-BR'),
          profissional: professional?.name || 'N/A',
          cliente: customer?.name || 'N/A',
          servico: service?.name || 'N/A',
          valor: `R$ ${servicePrice.toFixed(2).replace('.', ',')}`,
          status: appointment.status,
          telefone: customer?.phone || 'N/A',
          email: customer?.email || 'N/A'
        };
      });

      const selectedProfessional = professionalId && professionalId !== 'all'
        ? professionals.find(p => p.id === professionalId)
        : null;

      const reportData = {
        empresa: await storage.getClient(clientId),
        profissional: selectedProfessional,
        periodo: {
          inicio: periodStartDate.toLocaleDateString('pt-BR'),
          fim: periodEndDate.toLocaleDateString('pt-BR'),
          tipo: period === 'week' ? 'Semana' : period === 'month' ? 'Mês' : 'Personalizado'
        },
        resumo: {
          totalAgendamentos: appointments.length,
          agendamentosCompletos: completedAppointments.length,
          receitaTotal: `R$ ${totalRevenue.toFixed(2).replace('.', ',')}`,
          ticketMedio: completedAppointments.length > 0
            ? `R$ ${(totalRevenue / completedAppointments.length).toFixed(2).replace('.', ',')}`
            : 'R$ 0,00'
        },
        agendamentos: appointmentDetails
      };

      if (format === 'csv') {
        // Gerar CSV
        const csvHeader = 'Data,Hora,Profissional,Cliente,Serviço,Valor,Status,Telefone,Email\n';
        const csvRows = appointmentDetails.map(apt =>
          `${apt.data},${apt.hora},${apt.profissional},${apt.cliente},${apt.servico},${apt.valor},${apt.status},${apt.telefone},${apt.email}`
        ).join('\n');

        const csvContent = csvHeader + csvRows;

        const filename = `relatorio_${selectedProfessional?.name?.replace(/\s+/g, '_') || 'todos'}_${periodStartDate.toISOString().split('T')[0]}_${periodEndDate.toISOString().split('T')[0]}.csv`;

        res.setHeader('Content-Type', 'text/csv; charset=utf-8');
        res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
        res.send('\uFEFF' + csvContent); // BOM para UTF-8
      } else {
        // Retornar JSON
        res.json(reportData);
      }

    } catch (error) {
      console.error("Error generating report:", error);
      res.status(500).json({ message: "Erro ao gerar relatório" });
    }
  });

  // Professionals routes
  app.get("/api/professionals", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { client_id } = req.query;

      // Se for admin de empresa, filtrar pelos profissionais da empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          const professionals = await storage.listProfessionalsByClient(client.id);
          return res.json(professionals);
        }
      }

      // Se especificou client_id na query, filtrar por ele
      if (client_id) {
        const professionals = await storage.listProfessionalsByClient(client_id as string);
        return res.json(professionals);
      }

      // Super admin vê todos os profissionais
      const professionals = await storage.listProfessionals();
      res.json(professionals);
    } catch (error) {
      console.error("Error fetching professionals:", error);
      res.status(500).json({ message: "Erro ao buscar profissionais" });
    }
  });

  app.post("/api/professionals", requireAuth, checkUserLimits, async (req: AuthRequest, res: Response) => {
    try {
      const professional = await storage.createProfessional(req.body);
      res.status(201).json(professional);
    } catch (error) {
      console.error("Error creating professional:", error);
      res.status(500).json({ message: "Erro ao criar profissional" });
    }
  });

  app.get("/api/professionals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const professional = await storage.getProfessional(req.params.id);
      if (!professional) {
        return res.status(404).json({ message: "Profissional não encontrado" });
      }
      res.json(professional);
    } catch (error) {
      console.error("Error fetching professional:", error);
      res.status(500).json({ message: "Erro ao buscar profissional" });
    }
  });

  app.patch("/api/professionals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const professional = await storage.updateProfessional(req.params.id, req.body);
      if (!professional) {
        return res.status(404).json({ message: "Profissional não encontrado" });
      }
      res.json(professional);
    } catch (error) {
      console.error("Error updating professional:", error);
      res.status(500).json({ message: "Erro ao atualizar profissional" });
    }
  });

  app.delete("/api/professionals/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteProfessional(req.params.id);
      res.json({ message: "Profissional excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting professional:", error);
      res.status(500).json({ message: "Erro ao excluir profissional" });
    }
  });

  // Professional availability routes
  app.get("/api/professional-availability", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { professionalId, client_id } = req.query;

      // Se for admin de empresa, filtrar pelos profissionais da empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          const availabilities = await storage.listProfessionalAvailabilityByClient(client.id, professionalId as string);
          return res.json(availabilities);
        }
      }

      // Se especificou client_id na query e é super_admin, filtrar por ele
      if (client_id && req.user.role === 'super_admin') {
        const availabilities = await storage.listProfessionalAvailabilityByClient(client_id as string, professionalId as string);
        return res.json(availabilities);
      }

      // Super admin sem filtro específico
      const availabilities = await storage.listProfessionalAvailability(professionalId as string);
      res.json(availabilities);
    } catch (error) {
      console.error("Error fetching professional availability:", error);
      res.status(500).json({ message: "Erro ao buscar disponibilidade do profissional" });
    }
  });

  app.post("/api/professional-availability", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Se for admin de empresa, garantir que o profissional pertence à empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          // Verificar se o profissional pertence à empresa
          const professional = await storage.getProfessional(req.body.professionalId);
          if (!professional || professional.clientId !== client.id) {
            return res.status(403).json({ message: "Acesso negado: profissional não pertence à sua empresa" });
          }
          // Garantir que o client_id seja definido
          req.body.clientId = client.id;
        }
      }

      console.log("🔍 DEBUG - Dados recebidos no backend:", req.body);
      const availability = await storage.createProfessionalAvailability(req.body);
      console.log("🔍 DEBUG - Disponibilidade criada:", availability);
      res.status(201).json(availability);
    } catch (error) {
      console.error("Error creating professional availability:", error);
      res.status(500).json({ message: "Erro ao criar disponibilidade do profissional" });
    }
  });

  app.patch("/api/professional-availability/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Se for admin de empresa, verificar se a disponibilidade pertence à empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          const existingAvailability = await storage.getProfessionalAvailability(req.params.id);
          if (!existingAvailability) {
            return res.status(404).json({ message: "Disponibilidade não encontrada" });
          }

          // Verificar se o profissional pertence à empresa
          const professional = await storage.getProfessional(existingAvailability.professionalId);
          if (!professional || professional.clientId !== client.id) {
            return res.status(403).json({ message: "Acesso negado: disponibilidade não pertence à sua empresa" });
          }
        }
      }

      const availability = await storage.updateProfessionalAvailability(req.params.id, req.body);
      if (!availability) {
        return res.status(404).json({ message: "Disponibilidade não encontrada" });
      }
      res.json(availability);
    } catch (error) {
      console.error("Error updating professional availability:", error);
      res.status(500).json({ message: "Erro ao atualizar disponibilidade do profissional" });
    }
  });

  app.delete("/api/professional-availability/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Se for admin de empresa, verificar se a disponibilidade pertence à empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          const existingAvailability = await storage.getProfessionalAvailability(req.params.id);
          if (!existingAvailability) {
            return res.status(404).json({ message: "Disponibilidade não encontrada" });
          }

          // Verificar se o profissional pertence à empresa
          const professional = await storage.getProfessional(existingAvailability.professionalId);
          if (!professional || professional.clientId !== client.id) {
            return res.status(403).json({ message: "Acesso negado: disponibilidade não pertence à sua empresa" });
          }
        }
      }

      await storage.deleteProfessionalAvailability(req.params.id);
      res.json({ message: "Disponibilidade excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting professional availability:", error);
      res.status(500).json({ message: "Erro ao excluir disponibilidade do profissional" });
    }
  });

  // Rota para atualização mensal de horários
  app.post("/api/professional-availability/update-monthly", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { professionalId, month, year } = req.body;
      const result = await storage.updateMonthlyAvailability(professionalId, month, year);
      res.json(result);
    } catch (error) {
      console.error("Error updating monthly availability:", error);
      res.status(500).json({ message: "Erro ao atualizar horários mensais" });
    }
  });

  // Rota para gerar horários do próximo mês
  app.post("/api/professional-availability/generate-next-month", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { professionalId } = req.body;
      const result = await storage.generateNextMonthAvailability(professionalId);
      res.json(result);
    } catch (error) {
      console.error("Error generating next month availability:", error);
      res.status(500).json({ message: "Erro ao gerar horários do próximo mês" });
    }
  });

  // Specialties routes
  app.get("/api/specialties", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { client_id } = req.query;

      console.log('DEBUG - Specialties API called by user:', req.user.email, 'role:', req.user.role);

      // Super admin especial - sempre vê todas as especialidades
      if (req.user.email === "agenciambkautomacoes@gmail.com") {
        console.log('DEBUG - Super admin accessing specialties, returning all');
        const specialties = await storage.listSpecialties();
        return res.json(specialties);
      }

      // Se for admin de empresa, filtrar pelas especialidades da empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          const specialties = await storage.listSpecialtiesByClient(client.id);
          return res.json(specialties);
        }
      }

      // Se especificou client_id na query, filtrar por ele
      if (client_id) {
        const specialties = await storage.listSpecialtiesByClient(client_id as string);
        return res.json(specialties);
      }

      // Super admin vê todas as especialidades
      const specialties = await storage.listSpecialties();
      res.json(specialties);
    } catch (error) {
      console.error("Error fetching specialties:", error);
      res.status(500).json({ message: "Erro ao buscar especialidades" });
    }
  });

  app.post("/api/specialties", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const specialty = await storage.createSpecialty(req.body);
      res.status(201).json(specialty);
    } catch (error) {
      console.error("Error creating specialty:", error);
      res.status(500).json({ message: "Erro ao criar especialidade" });
    }
  });

  app.patch("/api/specialties/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const specialty = await storage.updateSpecialty(req.params.id, req.body);
      if (!specialty) {
        return res.status(404).json({ message: "Especialidade não encontrada" });
      }
      res.json(specialty);
    } catch (error) {
      console.error("Error updating specialty:", error);
      res.status(500).json({ message: "Erro ao atualizar especialidade" });
    }
  });

  app.delete("/api/specialties/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteSpecialty(req.params.id);
      res.json({ message: "Especialidade excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting specialty:", error);
      res.status(500).json({ message: "Erro ao excluir especialidade" });
    }
  });

  // Services routes
  app.get("/api/services", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { client_id } = req.query;

      console.log(`DEBUG - Services API called by user: ${req.user.email}, role: ${req.user.role}`);

      // Se for admin de empresa, filtrar pelos serviços da empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        console.log(`DEBUG - Company admin detected, filtering services`);
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          console.log(`DEBUG - Filtering services for client_id: ${client.id}`);
          const services = await storage.listServicesByClient(client.id);
          console.log(`DEBUG - Found ${services.length} services for client:`, services.map(s => ({ id: s.id, name: s.name, client_id: s.clientId })));
          return res.json(services);
        } else {
          console.log(`DEBUG - No client found for email: ${req.user.email}`);
        }
      }

      // Se especificou client_id na query, filtrar por ele
      if (client_id) {
        console.log(`DEBUG - Filtering by query client_id: ${client_id}`);
        const services = await storage.listServicesByClient(client_id as string);
        return res.json(services);
      }

      // Super admin vê todos os serviços
      console.log(`DEBUG - Super admin or no filter, returning all services`);
      const services = await storage.listServices();
      console.log(`DEBUG - Found ${services.length} total services:`, services.map(s => ({ id: s.id, name: s.name, client_id: s.clientId })));
      res.json(services);
    } catch (error) {
      console.error("Error fetching services:", error);
      res.status(500).json({ message: "Erro ao buscar serviços" });
    }
  });

  app.post("/api/services", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const service = await storage.createService(req.body);
      res.status(201).json(service);
    } catch (error) {
      console.error("Error creating service:", error);
      res.status(500).json({ message: "Erro ao criar serviço" });
    }
  });

  app.patch("/api/services/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const service = await storage.updateService(req.params.id, req.body);
      if (!service) {
        return res.status(404).json({ message: "Serviço não encontrado" });
      }
      res.json(service);
    } catch (error) {
      console.error("Error updating service:", error);
      res.status(500).json({ message: "Erro ao atualizar serviço" });
    }
  });

  app.delete("/api/services/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteService(req.params.id);
      res.json({ message: "Serviço excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting service:", error);
      res.status(500).json({ message: "Erro ao excluir serviço" });
    }
  });

  // Appointments routes
  app.get("/api/appointments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { date, professionalId, clientId } = req.query;
      const filters: any = {};

      // Se for admin de empresa, filtrar pelos agendamentos da empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          filters.clientId = client.id;
          console.log(`DEBUG - Filtering appointments for client_id: ${client.id}`);
        }
      }

      if (date) {
        filters.date = new Date(date as string);
      }
      if (professionalId) {
        filters.professionalId = professionalId as string;
      }
      if (clientId && req.user.role === 'super_admin') {
        filters.clientId = clientId as string;
      }

      const appointments = await storage.listAppointments(filters);
      console.log(`DEBUG - Found ${appointments.length} appointments for filters:`, filters);
      res.json(appointments);
    } catch (error) {
      console.error("Error fetching appointments:", error);
      res.status(500).json({ message: "Erro ao buscar agendamentos" });
    }
  });

  app.post("/api/appointments", requireAuth, checkAppointmentLimits, async (req: AuthRequest, res: Response) => {
    try {
      const appointmentData = req.body;

      // Validar campos obrigatórios (customer_id removido da lista)
      const requiredFields = ['client_id', 'professional_id', 'service_id', 'availability_id'];
      for (const field of requiredFields) {
        if (!appointmentData[field]) {
          return res.status(400).json({ message: `Campo ${field} é obrigatório` });
        }
      }

      const appointment = await storage.createAppointment(appointmentData);
      res.status(201).json(appointment);
    } catch (error) {
      console.error("Error creating appointment:", error);
      res.status(500).json({ message: "Erro ao criar agendamento" });
    }
  });

  app.get("/api/appointments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const appointment = await storage.getAppointment(req.params.id);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.json(appointment);
    } catch (error) {
      console.error("Error fetching appointment:", error);
      res.status(500).json({ message: "Erro ao buscar agendamento" });
    }
  });

  app.patch("/api/appointments/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const updatedAppointment = await storage.updateAppointment(req.params.id, req.body);
      if (!updatedAppointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }
      res.json(updatedAppointment);
    } catch (error) {
      console.error("Error updating appointment:", error);
      res.status(500).json({ message: "Erro ao atualizar agendamento" });
    }
  });

  // Cancel appointment endpoint with transaction logic
  app.post("/api/appointments/cancel", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { appointmentId, availabilityId } = req.body;
      
      if (!appointmentId) {
        return res.status(400).json({ message: "appointmentId é obrigatório" });
      }

      // Get appointment details first
      const appointment = await storage.getAppointment(appointmentId);
      if (!appointment) {
        return res.status(404).json({ message: "Agendamento não encontrado" });
      }

      // Cancel appointment with transaction logic
      await storage.cancelAppointment(appointmentId, availabilityId);
      
      res.json({ message: "Agendamento cancelado com sucesso" });
    } catch (error) {
      console.error("Error canceling appointment:", error);
      res.status(500).json({ message: "Erro ao cancelar agendamento" });
    }
  });

  // Webhook endpoint for external cancellation
  app.post("/webhook/cancel-appointment", async (req: Request, res: Response) => {
    try {
      const { sessionid, agendamento_id } = req.body;
      
      console.log('Webhook cancelamento recebido:', { sessionid, agendamento_id });
      
      if (!agendamento_id) {
        return res.status(400).json({ 
          message: "agendamento_id é obrigatório",
          received: req.body 
        });
      }

      if (!sessionid) {
        return res.status(400).json({ 
          message: "sessionid (telefone) é obrigatório",
          received: req.body 
        });
      }

      // Buscar agendamento pelo ID e validar telefone
      const appointments = await storage.listAppointments();
      const appointment = appointments.find(apt => 
        apt.id === agendamento_id && 
        apt.customerPhone === sessionid
      );

      if (!appointment) {
        return res.status(404).json({ 
          message: "Agendamento não encontrado ou telefone não confere",
          agendamento_id,
          sessionid 
        });
      }

      // Executar cancelamento com lógica transacional
      await storage.cancelAppointment(agendamento_id);
      
      console.log(`Agendamento ${agendamento_id} cancelado via webhook para telefone ${sessionid}`);
      
      res.json({ 
        message: "Agendamento cancelado com sucesso via webhook",
        agendamento_id,
        sessionid,
        customerName: appointment.customerName
      });
    } catch (error) {
      console.error("Error in webhook cancellation:", error);
      res.status(500).json({ 
        message: "Erro ao cancelar agendamento via webhook",
        error: error.message 
      });
    }
  });

  // Customers routes
  app.get("/api/customers", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { clientId } = req.query;
      let targetClientId = clientId as string;

      // Se for admin de empresa, filtrar pelos clientes da empresa
      if (req.user.role === 'company_admin' && req.user.email) {
        const client = await storage.getClientByEmail(req.user.email);
        if (client) {
          targetClientId = client.id;
          console.log(`DEBUG - Filtering customers for client_id: ${client.id}`);
        }
      }

      const customers = await storage.listCustomers(targetClientId);
      console.log(`DEBUG - Found ${customers.length} customers for client_id: ${targetClientId}`);
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Erro ao buscar clientes" });
    }
  });

  app.post("/api/customers", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      console.log("DEBUG - Customer creation request body:", req.body);
      
      // Validar dados obrigatórios
      if (!req.body.name) {
        return res.status(400).json({ message: "Nome é obrigatório" });
      }
      
      const customer = await storage.createCustomer(req.body);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Erro ao criar cliente" });
    }
  });

  app.patch("/api/customers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const customer = await storage.updateCustomer(req.params.id, req.body);
      if (!customer) {
        return res.status(404).json({ message: "Usuário não encontrado" });
      }
      res.json(customer);
    } catch (error) {
      console.error("Error updating customer:", error);
      res.status(500).json({ message: "Erro ao atualizar usuário" });
    }
  });

  app.delete("/api/customers/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteCustomer(req.params.id);
      res.json({ message: "Usuário excluído com sucesso" });
    } catch (error) {
      console.error("Error deleting customer:", error);
      res.status(500).json({ message: "Erro ao excluir usuário" });
    }
  });

  // Connections routes
  app.get("/api/connections", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const connections = await storage.listConnections();
      res.json(connections);
    } catch (error) {
      console.error("Error fetching connections:", error);
      res.status(500).json({ message: "Erro ao buscar conexões" });
    }
  });

  app.post("/api/connections", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const connection = await storage.createConnection(req.body);
      res.status(201).json(connection);
    } catch (error) {
      console.error("Error creating connection:", error);
      res.status(500).json({ message: "Erro ao criar conexão" });
    }
  });

  app.patch("/api/connections/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const connection = await storage.updateConnection(parseInt(req.params.id), req.body);
      if (!connection) {
        return res.status(404).json({ message: "Conexão não encontrada" });
      }
      res.json(connection);
    } catch (error) {
      console.error("Error updating connection:", error);
      res.status(500).json({ message: "Erro ao atualizar conexão" });
    }
  });

  app.delete("/api/connections/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteConnection(parseInt(req.params.id));
      res.json({ message: "Conexão excluída com sucesso" });
    } catch (error) {
      console.error("Error deleting connection:", error);
      res.status(500).json({ message: "Erro ao excluir conexão" });
    }
  });

  app.post("/api/connections/validate", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { host, token } = req.body;
      const result = await storage.validateConnection(host, token);
      res.json(result);
    } catch (error) {
      console.error("Error validating connection:", error);
      res.status(500).json({ message: "Erro ao validar conexão" });
    }
  });

  // AI Agent endpoints
  app.post("/api/ai-agent/lookup", async (req: Request, res: Response) => {
    try {
      const { tokenOrInstance } = req.body;
      
      if (!tokenOrInstance) {
        return res.status(400).json({ message: "Token ou instância é obrigatório" });
      }

      // Buscar cliente por whatsapp_instance_url
      const client = await storage.getClientByWhatsappInstance(tokenOrInstance);
      
      if (!client) {
        return res.status(404).json({ message: "Cliente não encontrado com esta instância/token" });
      }

      const result = {
        clientId: client.id,
        clientName: client.name,
        hasExistingPrompt: !!client.promptIa,
        currentPrompt: client.promptIa || '',
        agentName: client.agentName || ''
      };

      res.json(result);
    } catch (error) {
      console.error("Error looking up client:", error);
      res.status(500).json({ message: "Erro ao buscar cliente" });
    }
  });

  app.post("/api/ai-agent/save-prompt", async (req: Request, res: Response) => {
    try {
      const { clientId, prompt, agentName } = req.body;
      
      if (!clientId || !prompt) {
        return res.status(400).json({ message: "Client ID e prompt são obrigatórios" });
      }

      // Atualizar cliente com o prompt da IA
      const updates: any = { promptIa: prompt };
      if (agentName) {
        updates.agentName = agentName;
      }

      const updatedClient = await storage.updateClient(clientId, updates);
      
      if (!updatedClient) {
        return res.status(404).json({ message: "Cliente não encontrado" });
      }

      res.json({ 
        message: "Prompt salvo com sucesso",
        clientId: updatedClient.id,
        clientName: updatedClient.name
      });
    } catch (error) {
      console.error("Error saving prompt:", error);
      res.status(500).json({ message: "Erro ao salvar prompt" });
    }
  });

  // Diagnostic endpoint to check table structure
  app.get("/api/debug/tables", async (req: Request, res: Response) => {
    try {
      const { supabase } = await import("./supabase");
      
      // Check users table
      const { data: users, error: usersError } = await supabase
        .from('users')
        .select('*')
        .limit(1);
      
      // Check clients table  
      const { data: clients, error: clientsError } = await supabase
        .from('clients')
        .select('*')
        .limit(1);
      
      const result = {
        users: {
          error: usersError?.message,
          fields: users && users.length > 0 ? Object.keys(users[0]) : [],
          hasPassword: users && users.length > 0 ? Object.keys(users[0]).includes('password') : false,
          hasRole: users && users.length > 0 ? Object.keys(users[0]).includes('role') : false,
          count: users ? users.length : 0
        },
        clients: {
          error: clientsError?.message,
          fields: clients && clients.length > 0 ? Object.keys(clients[0]) : [],
          count: clients ? clients.length : 0
        }
      };
      
      res.json(result);
    } catch (error: any) {
      res.status(500).json({ error: error.message });
    }
  });

  // Backup endpoints
  app.post("/api/backup/create", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const filename = `backup_${timestamp}.sql`;
      
      // Criar backup dos dados principais
      const backupData = await storage.createBackup();
      
      res.json({ 
        success: true, 
        filename,
        message: "Backup criado com sucesso",
        size: `${Math.round(JSON.stringify(backupData).length / 1024)}KB`,
        timestamp
      });
    } catch (error: any) {
      console.error("Backup creation error:", error);
      res.status(500).json({ message: "Erro ao criar backup: " + error.message });
    }
  });

  app.get("/api/backup/download/:backupId", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { backupId } = req.params;
      
      // Gerar backup SQL real do banco
      const backupData = await storage.createBackup();
      const sqlContent = storage.generateSQLExport(backupData);
      
      res.setHeader('Content-Type', 'application/sql');
      res.setHeader('Content-Disposition', `attachment; filename="backup_${backupId}.sql"`);
      res.send(sqlContent);
    } catch (error: any) {
      console.error("Backup download error:", error);
      res.status(500).json({ message: "Erro ao baixar backup: " + error.message });
    }
  });

  // Professional Availability Management Routes
  app.get("/api/professional-availability", async (req: Request, res: Response) => {
    try {
      const { professionalId } = req.query;
      const availabilities = await storage.listProfessionalAvailability(professionalId as string);
      res.json(availabilities);
    } catch (error: any) {
      console.error("Error listing professional availability:", error);
      res.status(500).json({ message: "Erro ao listar disponibilidade profissional" });
    }
  });

  app.get("/api/professional-availability/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const availability = await storage.getProfessionalAvailability(id);
      
      if (!availability) {
        return res.status(404).json({ message: "Disponibilidade não encontrada" });
      }
      
      res.json(availability);
    } catch (error: any) {
      console.error("Error getting professional availability:", error);
      res.status(500).json({ message: "Erro ao buscar disponibilidade profissional" });
    }
  });



  app.patch("/api/professional-availability/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const availability = await storage.updateProfessionalAvailability(id, req.body);
      
      if (!availability) {
        return res.status(404).json({ message: "Disponibilidade não encontrada" });
      }
      
      res.json(availability);
    } catch (error: any) {
      console.error("Error updating professional availability:", error);
      res.status(500).json({ message: "Erro ao atualizar disponibilidade profissional" });
    }
  });

  app.delete("/api/professional-availability/:id", async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      await storage.deleteProfessionalAvailability(id);
      res.json({ message: "Disponibilidade removida com sucesso" });
    } catch (error: any) {
      console.error("Error deleting professional availability:", error);
      res.status(500).json({ message: "Erro ao remover disponibilidade profissional" });
    }
  });

  // Subscription Plans routes
  app.get("/api/subscription-plans", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const plans = await storage.listSubscriptionPlans();
      res.json(plans);
    } catch (error) {
      console.error("Error fetching subscription plans:", error);
      res.status(500).json({ message: "Erro ao buscar planos de assinatura" });
    }
  });

  app.get("/api/subscription-plans/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const plan = await storage.getSubscriptionPlan(parseInt(req.params.id));
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }
      res.json(plan);
    } catch (error) {
      console.error("Error fetching subscription plan:", error);
      res.status(500).json({ message: "Erro ao buscar plano de assinatura" });
    }
  });

  app.post("/api/subscription-plans", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      // Apenas super admin pode criar planos
      if (req.user.role !== 'super_admin') {
        return res.status(403).json({ message: "Acesso negado" });
      }

      const plan = await storage.createSubscriptionPlan(req.body);
      res.status(201).json(plan);
    } catch (error) {
      console.error("Error creating subscription plan:", error);
      res.status(500).json({ message: "Erro ao criar plano de assinatura" });
    }
  });

  // Subscriptions routes
  app.get("/api/subscriptions", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      let clientId: string | undefined;

      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client) {
          return res.status(403).json({ message: "Cliente não encontrado" });
        }
        clientId = client.id;
      } else if (req.query.client_id) {
        clientId = req.query.client_id as string;
      }

      const subscriptions = await storage.listSubscriptions(clientId);
      res.json(subscriptions);
    } catch (error) {
      console.error("Error fetching subscriptions:", error);
      res.status(500).json({ message: "Erro ao buscar assinaturas" });
    }
  });

  app.get("/api/subscriptions/:id", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const subscription = await storage.getSubscription(req.params.id);
      if (!subscription) {
        return res.status(404).json({ message: "Assinatura não encontrada" });
      }

      // Verificar permissão
      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client || client.id !== subscription.clientId) {
          return res.status(403).json({ message: "Acesso negado" });
        }
      }

      res.json(subscription);
    } catch (error) {
      console.error("Error fetching subscription:", error);
      res.status(500).json({ message: "Erro ao buscar assinatura" });
    }
  });

  // Create subscription with Asaas integration
  app.post("/api/subscriptions", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { planId, billingType, customerData } = req.body;

      let clientId: string;
      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client) {
          return res.status(403).json({ message: "Cliente não encontrado" });
        }
        clientId = client.id;
      } else {
        clientId = req.body.clientId;
      }

      // Buscar o plano
      const plan = await storage.getSubscriptionPlan(planId);
      if (!plan) {
        return res.status(404).json({ message: "Plano não encontrado" });
      }

      // Criar cliente no Asaas
      const asaasCustomer = await asaasService.createCustomer(customerData);

      // Criar assinatura no Asaas
      const nextDueDate = new Date();
      nextDueDate.setMonth(nextDueDate.getMonth() + 1);

      const asaasSubscription = await asaasService.createSubscription({
        customer: asaasCustomer.id!,
        billingType,
        value: plan.price,
        nextDueDate: nextDueDate.toISOString().split('T')[0],
        cycle: plan.billingCycle === 'monthly' ? 'MONTHLY' : 'YEARLY',
        description: `Assinatura ${plan.name} - SempreCheioApp`
      });

      // Criar assinatura local
      const subscription = await storage.createSubscription({
        clientId,
        planId,
        status: 'ACTIVE',
        currentPeriodStart: new Date(),
        currentPeriodEnd: nextDueDate,
        asaasSubscriptionId: asaasSubscription.id,
        asaasCustomerId: asaasCustomer.id!,
        cancelAtPeriodEnd: false
      });

      res.status(201).json(subscription);
    } catch (error) {
      console.error("Error creating subscription:", error);
      res.status(500).json({ message: "Erro ao criar assinatura" });
    }
  });

  // Invoices routes
  app.get("/api/invoices", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      let clientId: string | undefined;

      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client) {
          return res.status(403).json({ message: "Cliente não encontrado" });
        }
        clientId = client.id;
      } else if (req.query.client_id) {
        clientId = req.query.client_id as string;
      }

      const invoices = await storage.listInvoices(clientId);
      res.json(invoices);
    } catch (error) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ message: "Erro ao buscar faturas" });
    }
  });

  // Payments routes
  app.get("/api/payments", requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      let clientId: string | undefined;

      if (req.user.role === 'company_admin') {
        const client = await storage.getClientByEmail(req.user.email);
        if (!client) {
          return res.status(403).json({ message: "Cliente não encontrado" });
        }
        clientId = client.id;
      } else if (req.query.client_id) {
        clientId = req.query.client_id as string;
      }

      const payments = await storage.listPayments(clientId);
      res.json(payments);
    } catch (error) {
      console.error("Error fetching payments:", error);
      res.status(500).json({ message: "Erro ao buscar pagamentos" });
    }
  });

  // Asaas webhook endpoint
  app.post("/api/webhooks/asaas", async (req: Request, res: Response) => {
    try {
      const { event, payment } = req.body;

      console.log('Asaas webhook received:', event, payment);

      // Processar diferentes tipos de eventos
      switch (event) {
        case 'PAYMENT_RECEIVED':
          // Atualizar status da fatura
          const invoice = await storage.listInvoices().then(invoices =>
            invoices.find(inv => inv.asaasChargeId === payment.id)
          );

          if (invoice) {
            await storage.updateInvoice(invoice.id, {
              status: 'RECEIVED',
              paidAt: new Date(payment.dateCreated)
            });

            // Criar registro de pagamento
            await storage.createPayment({
              clientId: invoice.clientId,
              invoiceId: invoice.id,
              amount: payment.value,
              currency: 'BRL',
              status: 'RECEIVED',
              paymentMethod: payment.billingType,
              asaasPaymentId: payment.id,
              processedAt: new Date(payment.dateCreated)
            });
          }
          break;

        case 'PAYMENT_OVERDUE':
          // Marcar fatura como vencida
          const overdueInvoice = await storage.listInvoices().then(invoices =>
            invoices.find(inv => inv.asaasChargeId === payment.id)
          );

          if (overdueInvoice) {
            await storage.updateInvoice(overdueInvoice.id, {
              status: 'OVERDUE'
            });
          }
          break;
      }

      res.status(200).json({ received: true });
    } catch (error) {
      console.error("Error processing Asaas webhook:", error);
      res.status(500).json({ message: "Erro ao processar webhook" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
