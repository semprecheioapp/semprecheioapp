import { supabase } from "./supabase";
import bcrypt from "bcryptjs";
import {
  type User,
  type InsertUser,
  type Session,
  type Client,
  type InsertClient,
  type Professional,
  type InsertProfessional,
  type Specialty,
  type InsertSpecialty,
  type Service,
  type InsertService,
  type Appointment,
  type InsertAppointment,
  type Customer,
  type InsertCustomer,
  type Connection,
  type InsertConnection,
  type ProfessionalAvailability,
  type InsertProfessionalAvailability,
  type SubscriptionPlan,
  type Subscription,
  type Invoice,
  type Payment
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateUser(email: string, password: string): Promise<User | null>;
  createSession(userId: number, expiresAt: Date): Promise<Session>;
  getSession(sessionId: string): Promise<Session | undefined>;
  deleteSession(sessionId: string): Promise<void>;
  getUserBySessionId(sessionId: string): Promise<User | undefined>;
  
  // Client operations
  getClient(id: string): Promise<Client | undefined>;
  getClientByEmail(email: string): Promise<Client | undefined>;
  getClientByWhatsappInstance(whatsappInstanceUrl: string): Promise<Client | undefined>;
  createClient(client: InsertClient): Promise<Client>;
  validateClient(email: string, password: string): Promise<Client | null>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;
  listClients(): Promise<Client[]>;

  // Professional operations
  listProfessionals(): Promise<Professional[]>;
  listProfessionalsByClient(clientId: string): Promise<Professional[]>;
  getProfessional(id: string): Promise<Professional | undefined>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: string, updates: Partial<InsertProfessional>): Promise<Professional | undefined>;
  deleteProfessional(id: string): Promise<void>;

  // Specialty operations
  listSpecialties(): Promise<Specialty[]>;
  listSpecialtiesByClient(clientId: string): Promise<Specialty[]>;
  getSpecialty(id: string): Promise<Specialty | undefined>;
  createSpecialty(specialty: InsertSpecialty): Promise<Specialty>;
  updateSpecialty(id: string, updates: Partial<InsertSpecialty>): Promise<Specialty | undefined>;
  deleteSpecialty(id: string): Promise<void>;

  // Service operations
  listServices(): Promise<Service[]>;
  listServicesByClient(clientId: string): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;
  updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined>;
  deleteService(id: string): Promise<void>;

  // Appointment operations
  listAppointments(filters?: { date?: Date, professionalId?: string, clientId?: string }): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<void>;
  cancelAppointment(id: string, availabilityId?: string): Promise<void>;

  // Customer operations
  listCustomers(clientId?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;

  // Backup operations
  createBackup(): Promise<any>;
  generateSQLExport(backupData: any): string;
  updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined>;
  deleteCustomer(id: string): Promise<void>;

  // Connection operations
  listConnections(): Promise<Connection[]>;
  getConnection(id: number): Promise<Connection | undefined>;
  createConnection(connection: InsertConnection): Promise<Connection>;
  updateConnection(id: number, updates: Partial<InsertConnection>): Promise<Connection | undefined>;
  deleteConnection(id: number): Promise<void>;
  validateConnection(host: string, token: string): Promise<{ success: boolean; message?: string }>;

  // Professional Availability operations
  listProfessionalAvailability(professionalId?: string): Promise<ProfessionalAvailability[]>;
  getProfessionalAvailability(id: string): Promise<ProfessionalAvailability | undefined>;
  createProfessionalAvailability(availability: InsertProfessionalAvailability): Promise<ProfessionalAvailability>;
  updateProfessionalAvailability(id: string, updates: Partial<InsertProfessionalAvailability>): Promise<ProfessionalAvailability | undefined>;
  deleteProfessionalAvailability(id: string): Promise<void>;

  // Subscription Plans operations
  listSubscriptionPlans(): Promise<SubscriptionPlan[]>;
  getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined>;
  createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan>;
  updateSubscriptionPlan(id: number, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined>;
  deleteSubscriptionPlan(id: number): Promise<void>;

  // Subscriptions operations
  listSubscriptions(clientId?: string): Promise<Subscription[]>;
  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionByClient(clientId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription>;
  updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined>;
  cancelSubscription(id: string): Promise<void>;

  // Invoices operations
  listInvoices(clientId?: string): Promise<Invoice[]>;
  getInvoice(id: string): Promise<Invoice | undefined>;
  createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice>;
  updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined>;
  deleteInvoice(id: string): Promise<void>;

  // Payments operations
  listPayments(clientId?: string): Promise<Payment[]>;
  getPayment(id: string): Promise<Payment | undefined>;
  createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment>;
  updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined>;
}

export class ClientsAuthStorage implements IStorage {
  private sessions: Map<string, { userId: number, expiresAt: Date, createdAt: Date, email: string }> = new Map();

  constructor() {
    this.initializeTestData();
    this.initializePermanentSession();
  }

  private async initializePermanentSession() {
    // Create a permanent session for super admin to survive server restarts
    const permanentSessionId = "super-admin-session-permanent";
    const superAdminUserId = 165; // Real ID of agenciambkautomacoes@gmail.com client

    this.sessions.set(permanentSessionId, {
      userId: superAdminUserId,
      expiresAt: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
      createdAt: new Date(),
      email: "semprecheioapp@gmail.com"
    });

    console.log('Permanent session initialized for super admin');
  }

  private async initializeTestData() {
    // SEMPRE atualizar o super admin para garantir que a senha esteja correta
    await this.updateSuperAdminPassword();

    // Verificar se já existem clientes, se não, criar dados de teste
    const { data: clients } = await supabase.from('clients').select('*').limit(1);
    if (!clients || clients.length === 0) {
      await this.seedInitialData();
    }
  }

  private async seedInitialData() {
    try {
      // Criar super admin se não existir
      const { data: existingSuperAdmin } = await supabase
        .from('clients')
        .select('*')
        .eq('email', 'semprecheioapp@gmail.com')
        .single();

      if (!existingSuperAdmin) {
        const hashedPassword = await bcrypt.hash('99240601Ma@n', 10);
        await supabase.from('clients').insert({
          name: 'Super Admin - SempreCheioApp',
          email: 'semprecheioapp@gmail.com',
          phone: '556699618890',
          service_type: 'super_admin',
          is_active: true,
          password: hashedPassword
        });
        console.log('Super admin created successfully');
      } else {
        // Atualizar senha do super admin existente
        const hashedPassword = await bcrypt.hash('99240601Ma@n', 10);
        await supabase
          .from('clients')
          .update({
            password: hashedPassword,
            name: 'Super Admin - SempreCheioApp',
            service_type: 'super_admin'
          })
          .eq('email', 'semprecheioapp@gmail.com');
        console.log('Super admin password updated successfully');
      }

      // Criar planos de assinatura se não existirem
      await this.seedSubscriptionPlans();

      console.log('Super admin data seeded successfully');
    } catch (error) {
      console.error('Error seeding super admin data:', error);
    }
  }

  private async seedSubscriptionPlans() {
    try {
      // Verificar se já existem planos
      const { data: existingPlans } = await supabase
        .from('subscription_plans')
        .select('*')
        .limit(1);

      if (!existingPlans || existingPlans.length === 0) {
        const plans = [
          {
            name: 'Básico',
            description: 'Plano ideal para pequenos negócios que estão começando',
            price: 97.00,
            currency: 'BRL',
            billing_cycle: 'monthly',
            max_users: 5,
            max_appointments: 100,
            max_storage: 1,
            features: [
              'Agenda básica',
              'WhatsApp integrado',
              'Até 5 profissionais',
              'Até 100 agendamentos/mês',
              '1GB de armazenamento',
              'Suporte por email'
            ],
            is_active: true
          },
          {
            name: 'Profissional',
            description: 'Plano completo para empresas em crescimento',
            price: 197.00,
            currency: 'BRL',
            billing_cycle: 'monthly',
            max_users: 15,
            max_appointments: 500,
            max_storage: 5,
            features: [
              'Agenda avançada',
              'WhatsApp + IA integrada',
              'Até 15 profissionais',
              'Até 500 agendamentos/mês',
              '5GB de armazenamento',
              'Relatórios avançados',
              'Suporte prioritário',
              'Personalização de marca'
            ],
            is_active: true
          },
          {
            name: 'Empresarial',
            description: 'Solução completa para grandes empresas',
            price: 397.00,
            currency: 'BRL',
            billing_cycle: 'monthly',
            max_users: 50,
            max_appointments: 2000,
            max_storage: 20,
            features: [
              'Recursos ilimitados',
              'IA avançada personalizada',
              'Até 50 profissionais',
              'Até 2000 agendamentos/mês',
              '20GB de armazenamento',
              'API personalizada',
              'Integração com sistemas externos',
              'Suporte 24/7',
              'Gerente de conta dedicado'
            ],
            is_active: true
          }
        ];

        for (const plan of plans) {
          await supabase.from('subscription_plans').insert(plan);
        }

        console.log('Subscription plans seeded successfully');
      }
    } catch (error) {
      console.error('Error seeding subscription plans:', error);
    }
  }

  // Public method to force super admin password update
  async updateSuperAdminPassword() {
    try {
      console.log('Forcing super admin password update...');
      const hashedPassword = await bcrypt.hash('99240601Ma@n', 10);
      const { data, error } = await supabase
        .from('clients')
        .update({
          password: hashedPassword,
          name: 'Super Admin - SempreCheioApp',
          service_type: 'super_admin'
        })
        .eq('email', 'semprecheioapp@gmail.com')
        .select();

      if (error) {
        console.error('Error updating super admin password:', error);
        return false;
      }

      console.log('Super admin password force updated successfully');
      return true;
    } catch (error) {
      console.error('Error in updateSuperAdminPassword:', error);
      return false;
    }
  }

  // Autenticação usando a tabela clients
  async getUser(id: number): Promise<User | undefined> {
    console.log('Getting user by ID:', id);
    
    // Buscar cliente por ID convertido de volta para UUID
    const { data: clients, error } = await supabase
      .from('clients')
      .select('*');
    
    if (error || !clients) {
      console.log('Error fetching clients or no clients found');
      return undefined;
    }
    
    console.log(`Searching among ${clients.length} clients for ID:`, id);
    
    // Encontrar o cliente correto baseado no ID hash
    for (const client of clients) {
      const clientHashId = Math.abs(client.id.split('').reduce((a: any, b: any) => { 
        a = ((a << 5) - a) + b.charCodeAt(0); 
        return a & a 
      }, 0));
      
      console.log(`Client ${client.email} has hash ID:`, clientHashId);
      
      if (clientHashId === id) {
        console.log('Found matching client:', client.email);
        return {
          id: clientHashId,
          name: client.name,
          email: client.email,
          password: client.password || '',
          role: 'client',
          createdAt: new Date(client.created_at)
        } as User;
      }
    }
    
    console.log('No matching client found for ID:', id);
    return undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    // Buscar cliente por email e converter para User
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return undefined;
    
    return {
      id: parseInt(data.id) || 1,
      name: data.name,
      email: data.email,
      password: data.password || '',
      role: 'admin',
      createdAt: new Date(data.created_at)
    } as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Criar cliente e retornar como User
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: insertUser.name,
        email: insertUser.email,
        password: hashedPassword,
        is_active: true,
        service_type: 'geral'
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create user');
    }

    return {
      id: parseInt(data.id),
      name: data.name,
      email: data.email,
      password: data.password,
      role: insertUser.role || 'admin',
      createdAt: new Date(data.created_at)
    } as User;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    console.log('Validating user:', email);
    
    // Buscar cliente e validar senha
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) {
      console.log('User not found:', error?.message);
      return null;
    }
    
    if (!data.password) {
      console.log('No password set for user');
      return null;
    }
    
    try {
      console.log('Comparing password...');
      const isValid = await bcrypt.compare(password, data.password);
      console.log('Password validation result:', isValid);
      
      if (!isValid) {
        console.log('Invalid password');
        return null;
      }
      
      const user = {
        id: Math.abs(data.id.split('').reduce((a, b) => { a = ((a << 5) - a) + b.charCodeAt(0); return a & a }, 0)),
        name: data.name,
        email: data.email,
        password: data.password,
        role: 'admin',
        createdAt: new Date(data.created_at)
      } as User;
      
      console.log('User validated successfully:', user.id, user.email);
      return user;
    } catch (err) {
      console.error('Error validating password:', err);
      return null;
    }
  }

  async createSession(userId: number, expiresAt: Date, userEmail?: string): Promise<Session> {
    try {
      console.log('Creating session for userId:', userId, 'email:', userEmail);
      const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);

      // If email not provided, try to find it
      if (!userEmail) {
        const { data: clients } = await supabase
          .from('clients')
          .select('*')
          .limit(1000);

        if (clients) {
          for (const client of clients) {
            const clientUserId = Math.abs(client.id.split('').reduce((a: any, b: any) => {
              a = ((a << 5) - a) + b.charCodeAt(0);
              return a & a
            }, 0));

            if (clientUserId === userId) {
              userEmail = client.email;
              break;
            }
          }
        }
      }

      const sessionData = {
        userId,
        expiresAt,
        createdAt: new Date(),
        email: userEmail || ''
      };

      // Store in memory with email for direct lookup
      this.sessions.set(sessionId, sessionData);

      console.log('Session created successfully:', sessionId, 'for email:', userEmail);

      return {
        id: sessionId,
        userId: sessionData.userId,
        expiresAt: sessionData.expiresAt,
        createdAt: sessionData.createdAt
      } as Session;
    } catch (error) {
      console.error('Error in createSession:', error);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const sessionData = this.sessions.get(sessionId);
    if (!sessionData) return undefined;
    
    return {
      id: sessionId,
      userId: sessionData.userId,
      expiresAt: sessionData.expiresAt,
      createdAt: sessionData.createdAt
    } as Session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    console.log('Looking up session:', sessionId);

    // Check for permanent super admin session first
    if (sessionId === "super-admin-session-permanent") {
      console.log('Using permanent super admin session');
      const superAdminClient = await this.getClientByEmail("semprecheioapp@gmail.com");
      if (superAdminClient) {
        return {
          id: 165,
          name: superAdminClient.name,
          email: superAdminClient.email,
          password: superAdminClient.password || '',
          role: 'super_admin',
          createdAt: superAdminClient.createdAt || new Date()
        } as User;
      }
    }
    
    // Check regular sessions
    const sessionData = this.sessions.get(sessionId);
    console.log('Session data found:', !!sessionData);
    
    if (!sessionData) {
      console.log('No session data found for:', sessionId);
      return undefined;
    }
    
    if (sessionData.expiresAt < new Date()) {
      console.log('Session expired for:', sessionId);
      this.sessions.delete(sessionId);
      return undefined;
    }
    
    console.log('Session valid, looking up user with ID:', sessionData.userId);
    
    // Use email from session if available
    if (sessionData.email) {
      console.log('Using email from session:', sessionData.email);
      const client = await this.getClientByEmail(sessionData.email);
      if (client) {
        console.log('Found client by email');
        return {
          id: sessionData.userId,
          name: client.name,
          email: client.email,
          password: client.password || '',
          role: 'company_admin',
          createdAt: client.createdAt || new Date()
        } as User;
      }
    }
    
    // Fallback to ID lookup
    console.log('Fallback to ID lookup');
    const { data: clients } = await supabase
      .from('clients')
      .select('*')
      .limit(1000);
    
    if (clients) {
      for (const client of clients) {
        const clientUserId = Math.abs(client.id.split('').reduce((a: any, b: any) => { 
          a = ((a << 5) - a) + b.charCodeAt(0); 
          return a & a 
        }, 0));
        
        if (clientUserId === sessionData.userId) {
          console.log('Found client by ID lookup');
          return {
            id: clientUserId,
            name: client.name,
            email: client.email,
            password: client.password || '',
            role: 'company_admin',
            createdAt: new Date(client.created_at)
          } as User;
        }
      }
    }
    
    console.log('No user found for session');
    return undefined;
  }

  // Client operations usando dados reais do Supabase
  async getClient(id: string): Promise<Client | undefined> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapClientFromSupabase(data);
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email);

    if (error || !data || data.length === 0) {
      console.log('getClientByEmail - No client found for email:', email);
      return undefined;
    }

    // If multiple clients with same email, get the most recent one
    const client = data.length > 1 ? data.sort((a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )[0] : data[0];

    console.log('getClientByEmail - Found client:', client.email, 'created at:', client.created_at);
    return this.mapClientFromSupabase(client);
  }

  async getClientByWhatsappInstance(whatsappInstanceUrl: string): Promise<Client | undefined> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('whatsapp_instance_url', whatsappInstanceUrl)
      .single();
    
    if (error || !data) return undefined;
    return this.mapClientFromSupabase(data);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    // Hash the password before storing
    const hashedPassword = insertClient.password ? await bcrypt.hash(insertClient.password, 10) : null;

    const { data, error } = await supabase
      .from('clients')
      .insert({
        name: insertClient.name,
        email: insertClient.email,
        phone: insertClient.phone,
        service_type: insertClient.serviceType,
        whatsapp_instance_url: insertClient.whatsappInstanceUrl,
        settings: insertClient.settings,
        assistant_id: insertClient.assistantId,
        password: hashedPassword,
        is_active: insertClient.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create client');
    }

    return this.mapClientFromSupabase(data);
  }

  async validateClient(email: string, password: string): Promise<Client | null> {
    const client = await this.getClientByEmail(email);
    if (!client || !client.password || !password) return null;
    
    const isValid = await bcrypt.compare(password, client.password);
    return isValid ? client : null;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    // Hash password if provided
    const hashedPassword = updates.password ? await bcrypt.hash(updates.password, 10) : undefined;

    // Prepare update data, only including fields that are provided
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.serviceType !== undefined) updateData.service_type = updates.serviceType;
    if (updates.whatsappInstanceUrl !== undefined) updateData.whatsapp_instance_url = updates.whatsappInstanceUrl;
    if (updates.settings !== undefined) updateData.settings = updates.settings;
    if (updates.assistantId !== undefined) updateData.assistant_id = updates.assistantId;
    if (hashedPassword !== undefined) updateData.password = hashedPassword;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
    if (updates.promptIa !== undefined) updateData.prompt_ia = updates.promptIa;
    if (updates.agentName !== undefined) updateData.agent_name = updates.agentName;

    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapClientFromSupabase(data);
  }

  async deleteClient(id: string): Promise<void> {
    await supabase.from('clients').delete().eq('id', id);
  }

  async listClients(): Promise<Client[]> {
    const { data, error } = await supabase
      .from('clients')
      .select('*')
      .eq('is_active', true)
      .order('created_at', { ascending: false });
    
    if (error || !data) return [];
    return data.map(this.mapClientFromSupabase);
  }

  // Professional operations
  async listProfessionals(): Promise<Professional[]> {
    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        specialties:specialty_id (
          id,
          name,
          description,
          color
        )
      `)
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapProfessionalFromSupabaseWithSpecialty);
  }

  async listProfessionalsByClient(clientId: string): Promise<Professional[]> {
    const { data, error } = await supabase
      .from('professionals')
      .select(`
        *,
        specialties:specialty_id (
          id,
          name,
          description,
          color
        )
      `)
      .eq('is_active', true)
      .eq('client_id', clientId)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapProfessionalFromSupabaseWithSpecialty);
  }

  async getProfessional(id: string): Promise<Professional | undefined> {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapProfessionalFromSupabase(data);
  }

  async createProfessional(professional: InsertProfessional): Promise<Professional> {
    const { data, error } = await supabase
      .from('professionals')
      .insert({
        name: professional.name,
        email: professional.email,
        phone: professional.phone,
        specialty_id: professional.specialtyId,
        client_id: professional.clientId,
        is_active: professional.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create professional');
    }

    return this.mapProfessionalFromSupabase(data);
  }

  async updateProfessional(id: string, updates: Partial<InsertProfessional>): Promise<Professional | undefined> {
    const { data, error } = await supabase
      .from('professionals')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        specialty_id: updates.specialtyId,
        client_id: updates.clientId,
        is_active: updates.isActive
      })
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapProfessionalFromSupabase(data);
  }

  async deleteProfessional(id: string): Promise<void> {
    await supabase.from('professionals').update({ is_active: false }).eq('id', id);
  }

  // Specialty operations
  async listSpecialties(): Promise<Specialty[]> {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapSpecialtyFromSupabase);
  }

  async listSpecialtiesByClient(clientId: string): Promise<Specialty[]> {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .eq('is_active', true)
      .eq('client_id', clientId)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapSpecialtyFromSupabase);
  }

  async getSpecialty(id: string): Promise<Specialty | undefined> {
    const { data, error } = await supabase
      .from('specialties')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapSpecialtyFromSupabase(data);
  }

  async createSpecialty(specialty: InsertSpecialty): Promise<Specialty> {
    const { data, error } = await supabase
      .from('specialties')
      .insert({
        name: specialty.name,
        description: specialty.description,
        color: specialty.color || '#3B82F6',
        service_id: specialty.serviceId,
        is_active: specialty.isActive ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase error creating specialty:', error);
      throw new Error(`Failed to create specialty: ${error.message}`);
    }

    if (!data) {
      throw new Error('No data returned after creating specialty');
    }

    return this.mapSpecialtyFromSupabase(data);
  }

  async updateSpecialty(id: string, updates: Partial<InsertSpecialty>): Promise<Specialty | undefined> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.color) updateData.color = updates.color;
    if (updates.serviceId !== undefined) updateData.service_id = updates.serviceId;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('specialties')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapSpecialtyFromSupabase(data);
  }

  async deleteSpecialty(id: string): Promise<void> {
    await supabase.from('specialties').update({ is_active: false }).eq('id', id);
  }

  // Service operations
  async listServices(): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapServiceFromSupabase);
  }

  async listServicesByClient(clientId: string): Promise<Service[]> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('is_active', true)
      .eq('client_id', clientId)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapServiceFromSupabase);
  }

  async getService(id: string): Promise<Service | undefined> {
    const { data, error } = await supabase
      .from('services')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapServiceFromSupabase(data);
  }

  async createService(service: InsertService): Promise<Service> {
    console.log('DEBUG - createService called with:', service);
    
    const insertData = {
      name: service.name,
      category: service.category,
      description: service.description,
      duration: service.duration,
      price: service.price,
      client_id: service.clientId,
      is_active: service.isActive ?? true
    };
    
    console.log('DEBUG - insertData for services table:', insertData);
    
    const { data, error } = await supabase
      .from('services')
      .insert(insertData)
      .select()
      .single();

    console.log('DEBUG - Supabase response:', { data, error });

    if (error || !data) {
      console.error('DEBUG - Error creating service:', error);
      throw new Error(`Failed to create service: ${error?.message || 'Unknown error'}`);
    }

    return this.mapServiceFromSupabase(data);
  }

  async updateService(id: string, updates: Partial<InsertService>): Promise<Service | undefined> {
    const updateData: any = {};
    if (updates.name) updateData.name = updates.name;
    if (updates.category) updateData.category = updates.category;
    if (updates.description) updateData.description = updates.description;
    if (updates.duration) updateData.duration = updates.duration;
    if (updates.price) updateData.price = updates.price;
    if (updates.clientId) updateData.client_id = updates.clientId;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('services')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapServiceFromSupabase(data);
  }

  async deleteService(id: string): Promise<void> {
    const { error } = await supabase
      .from('services')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error('Failed to delete service');
    }
  }

  // Appointment operations
  async listAppointments(filters?: { date?: Date, professionalId?: string, clientId?: string }): Promise<Appointment[]> {
    console.log('DEBUG - listAppointments called with filters:', filters);
    
    // 1. Buscar appointments confirmados com informações do customer
    let appointmentsQuery = supabase.from('appointments')
      .select(`
        *,
        customers(name, email, phone)
      `)
      .eq('status', 'confirmado')
      .order('created_at', { ascending: false });

    if (filters?.professionalId) {
      appointmentsQuery = appointmentsQuery.eq('professional_id', filters.professionalId);
    }

    if (filters?.clientId) {
      appointmentsQuery = appointmentsQuery.eq('client_id', filters.clientId);
    }

    const { data: appointmentsData, error: appointmentsError } = await appointmentsQuery;
    
    console.log('DEBUG - Appointments query result:', { appointmentsData, appointmentsError, count: appointmentsData?.length });
    
    if (appointmentsError) {
      console.error('DEBUG - Appointments error:', appointmentsError);
      return [];
    }
    
    if (!appointmentsData || appointmentsData.length === 0) {
      console.log('DEBUG - No confirmed appointments found');
      return [];
    }

    // 2. Buscar horários específicos usando availability_id de cada appointment
    const appointmentsWithSchedule = await Promise.all(appointmentsData.map(async (appointment: any) => {
      console.log('DEBUG - Processing appointment:', appointment);
      
      // Buscar horário específico usando availability_id
      let schedule = null;
      if (appointment.availability_id) {
        const { data: scheduleData, error: scheduleError } = await supabase
          .from('professional_availability')
          .select('*')
          .eq('id', appointment.availability_id)
          .single();
        
        if (!scheduleError && scheduleData) {
          schedule = scheduleData;
        }
      }

      console.log('DEBUG - Found schedule for appointment:', { 
        appointmentId: appointment.id,
        availabilityId: appointment.availability_id,
        schedule: schedule
      });

      // Usar horário da availability - combinar data + start_time
      let scheduledAt;
      if (schedule?.date && schedule?.start_time) {
        // Combinar data e horário: '2025-06-27' + '15:00:00' = '2025-06-27T15:00:00'
        scheduledAt = `${schedule.date}T${schedule.start_time}`;
      } else {
        scheduledAt = appointment.created_at;
      }

      return {
        id: appointment.id,
        clientId: appointment.client_id,
        professionalId: appointment.professional_id,
        serviceId: appointment.service_id,
        customerId: appointment.customer_id,
        scheduledAt: new Date(scheduledAt),
        startTime: schedule?.start_time || null,
        endTime: schedule?.end_time || null,
        duration: appointment.duration || 60,
        status: appointment.status,
        notes: appointment.notes,
        createdAt: new Date(appointment.created_at),
        updatedAt: appointment.updated_at ? new Date(appointment.updated_at) : null,
        // Incluir dados do customer do JOIN
        customerName: appointment.customers?.name || null,
        customerEmail: appointment.customers?.email || null,
        customerPhone: appointment.customers?.phone || null
      };
    }));
    
    console.log('DEBUG - Final appointments with schedule:', appointmentsWithSchedule);
    
    return appointmentsWithSchedule;
  }

  async getAppointment(id: string): Promise<Appointment | undefined> {
    const { data, error } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapAppointmentFromSupabase(data);
  }

  async createAppointment(appointmentData: any): Promise<any> {
    try {
      const { data, error } = await supabase
        .from('appointments')
        .insert({
          client_id: appointmentData.client_id,
          professional_id: appointmentData.professional_id,
          service_id: appointmentData.service_id,
          specialty_id: appointmentData.specialty_id || null,
          customer_id: appointmentData.customer_id || null, // Agora opcional
          availability_id: appointmentData.availability_id,
          scheduled_at: appointmentData.scheduled_at || new Date().toISOString(),
          status: appointmentData.status || 'pendente',
          customer_name: appointmentData.customer_name || null,
          customer_phone: appointmentData.customer_phone || null
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating appointment:', error);
        throw new Error(`Failed to create appointment: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('Error in createAppointment:', error);
      throw error;
    }
  }

  async updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined> {
    const updateData: any = {};
    if (updates.clientId) updateData.client_id = updates.clientId;
    if (updates.professionalId) updateData.professional_id = updates.professionalId;
    if (updates.serviceId) updateData.service_id = updates.serviceId;
    if (updates.scheduledAt) updateData.scheduled_at = updates.scheduledAt.toISOString();
    if (updates.duration) updateData.duration = updates.duration;
    if (updates.status) updateData.status = updates.status;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabase
      .from('appointments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) return undefined;
    return this.mapAppointmentFromSupabase(data);
  }

  async deleteAppointment(id: string): Promise<void> {
    await supabase.from('appointments').delete().eq('id', id);
  }

  async cancelAppointment(id: string, availabilityId?: string): Promise<void> {
    // Get appointment details to find availability_id if not provided
    const { data: appointment, error: appointmentError } = await supabase
      .from('appointments')
      .select('availability_id, professional_id')
      .eq('id', id)
      .single();

    if (appointmentError || !appointment) {
      throw new Error('Agendamento não encontrado');
    }

    // Use provided availabilityId or fall back to appointment's availability_id
    const targetAvailabilityId = availabilityId || appointment.availability_id;

    // Start transaction-like operations - exatamente como o n8n
    try {
      // 1. Liberar o horário do profissional (is_active = true)
      if (targetAvailabilityId) {
        const { error: availabilityError } = await supabase
          .from('professional_availability')
          .update({ is_active: true })
          .eq('id', targetAvailabilityId);
        
        if (availabilityError) {
          console.error('Error updating professional_availability:', availabilityError);
          throw new Error('Erro ao liberar horário do profissional');
        }
      }

      // 2. Deletar o agendamento
      const { error: deleteError } = await supabase
        .from('appointments')
        .delete()
        .eq('id', id);

      if (deleteError) {
        console.error('Error deleting appointment:', deleteError);
        throw new Error('Erro ao remover agendamento');
      }

      console.log(`Appointment ${id} cancelled successfully, availability ${targetAvailabilityId} freed`);
    } catch (error) {
      console.error('Error in cancelAppointment transaction:', error);
      throw error;
    }
  }

  // Customer operations
  async listCustomers(clientId?: string): Promise<Customer[]> {
    let query = supabase.from('customers').select('*').order('name');

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    
    console.log('DEBUG - listCustomers query result:', { 
      data: data?.slice(0, 3), // Show first 3 items
      dataLength: data?.length,
      error, 
      clientId,
      queryString: query.toString()
    });
    
    if (error) {
      console.error('Supabase customers query error:', error);
      return [];
    }
    
    if (!data) return [];
    return data.map(this.mapCustomerFromSupabase);
  }

  async getCustomer(id: string): Promise<Customer | undefined> {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return this.mapCustomerFromSupabase(data);
  }

  async createBackup(): Promise<any> {
    try {
      // Buscar todos os dados das tabelas principais
      const [clients, professionals, services, specialties, appointments, customers] = await Promise.all([
        this.listClients(),
        this.listProfessionals(),
        this.listServices(),
        this.listSpecialties(),
        this.listAppointments(),
        this.listCustomers()
      ]);

      return {
        timestamp: new Date().toISOString(),
        tables: {
          clients,
          professionals,
          services,
          specialties,
          appointments,
          customers
        },
        metadata: {
          version: "1.0",
          totalRecords: clients.length + professionals.length + services.length + specialties.length + appointments.length + customers.length
        }
      };
    } catch (error) {
      console.error("Error creating backup:", error);
      throw new Error("Falha ao criar backup do banco de dados");
    }
  }

  generateSQLExport(backupData: any): string {
    try {
      const timestamp = new Date().toISOString();
      let sql = `-- Backup SQL gerado em ${timestamp}\n`;
      sql += `-- SempreCheioApp - Sistema de Agendamento\n`;
      sql += `-- Total de registros: ${backupData.metadata.totalRecords}\n\n`;

      // Gerar INSERT statements para cada tabela
      const tables = backupData.tables;
      
      Object.keys(tables).forEach(tableName => {
        const records = tables[tableName];
        if (records && records.length > 0) {
          sql += `-- Dados da tabela: ${tableName}\n`;
          sql += `-- Total de registros: ${records.length}\n\n`;
          
          records.forEach((record: any, index: number) => {
            try {
              const columns = Object.keys(record).join(', ');
              const values = Object.values(record).map((value, valueIndex) => {
                try {
                  if (value === null || value === undefined) return 'NULL';
                  if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
                  
                  // Tratamento especial para strings que representam datas
                  if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/)) {
                    const date = new Date(value);
                    if (!isNaN(date.getTime())) {
                      return `'${date.toISOString()}'`;
                    }
                    return `'${value}'`;
                  }
                  
                  if (value instanceof Date) {
                    if (isNaN(value.getTime())) return 'NULL';
                    return `'${value.toISOString()}'`;
                  }
                  
                  if (typeof value === 'object') return `'${JSON.stringify(value).replace(/'/g, "''")}'`;
                  if (typeof value === 'boolean') return value ? 'TRUE' : 'FALSE';
                  if (typeof value === 'number') return value.toString();
                  
                  return `'${String(value).replace(/'/g, "''")}'`;
                } catch (valueError) {
                  console.error(`Error processing value at index ${valueIndex} in record ${index} of table ${tableName}:`, valueError);
                  return 'NULL';
                }
              }).join(', ');
              
              sql += `INSERT INTO ${tableName} (${columns}) VALUES (${values});\n`;
            } catch (recordError) {
              console.error(`Error processing record ${index} in table ${tableName}:`, recordError);
              sql += `-- Erro ao processar registro ${index}\n`;
            }
          });
          sql += '\n';
        }
      });

      sql += `-- Backup finalizado em ${new Date().toISOString()}\n`;
      return sql;
    } catch (error) {
      console.error("Error generating SQL export:", error);
      throw new Error("Falha ao gerar arquivo SQL de backup");
    }
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    console.log('DEBUG - createCustomer called with:', customer);
    
    const insertData = {
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      cpf_cnpj: customer.cpfCnpj,
      notes: customer.notes,
      client_id: customer.clientId
    };
    
    console.log('DEBUG - Insert data for customer:', insertData);
    
    const { data, error } = await supabase
      .from('customers')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('DEBUG - Supabase error creating customer:', error);
      throw new Error(`Failed to create customer: ${error.message}`);
    }
    
    if (!data) {
      console.error('DEBUG - No data returned from customer creation');
      throw new Error('Failed to create customer: No data returned');
    }
    
    console.log('DEBUG - Customer created successfully:', data);
    return this.mapCustomerFromSupabase(data);
  }

  async updateCustomer(id: string, updates: Partial<InsertCustomer>): Promise<Customer | undefined> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.email !== undefined) updateData.email = updates.email;
    if (updates.phone !== undefined) updateData.phone = updates.phone;
    if (updates.cpfCnpj !== undefined) updateData.cpf_cnpj = updates.cpfCnpj;
    if (updates.notes !== undefined) updateData.notes = updates.notes;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      return undefined;
    }

    return this.mapCustomerFromSupabase(data);
  }

  async deleteCustomer(id: string): Promise<void> {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error('Failed to delete customer');
    }
  }

  // Helper methods para mapear dados do Supabase para nossos tipos
  private mapClientFromSupabase(data: any): Client {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      createdAt: new Date(data.created_at),
      isActive: data.is_active,
      serviceType: data.service_type,
      whatsappInstanceUrl: data.whatsapp_instance_url,
      settings: data.settings,
      assistantId: data.assistant_id,
      password: data.password,
      promptIa: data.prompt_ia,
      agentName: data.agent_name
    };
  }

  private mapProfessionalFromSupabase(data: any): Professional {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      specialtyId: data.specialty_id,
      clientId: data.client_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapProfessionalFromSupabaseWithSpecialty(data: any): Professional & { specialtyName?: string; color?: string } {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      specialtyId: data.specialty_id,
      specialtyName: data.specialties?.name || 'Sem especialidade',
      color: data.specialties?.color || '#A78BFA',
      clientId: data.client_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapSpecialtyFromSupabase(data: any): Specialty {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color || '#3B82F6',
      serviceId: data.service_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapServiceFromSupabase(data: any): Service {
    return {
      id: data.id,
      name: data.name,
      category: data.category,
      description: data.description,
      duration: data.duration,
      price: data.price,
      specialtyId: null, // Campo removido da tabela services no Supabase
      clientId: data.client_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapAppointmentFromSupabase(data: any): Appointment {
    return {
      id: data.id,
      clientId: data.client_id,
      professionalId: data.professional_id,
      serviceId: data.service_id,
      scheduledAt: new Date(data.scheduled_at),
      duration: data.duration,
      status: data.status,
      notes: data.notes,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  private mapCustomerFromSupabase(data: any): Customer {
    return {
      id: data.id,
      name: data.name,
      email: data.email,
      phone: data.phone,
      cpfCnpj: data.cpf_cnpj,
      notes: data.notes,
      clientId: data.client_id,
      createdAt: new Date(data.created_at)
    };
  }

  // Connection operations
  async listConnections(): Promise<Connection[]> {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching connections:', error);
      throw new Error('Failed to fetch connections');
    }

    return data?.map((item: any) => this.mapConnectionFromSupabase(item)) || [];
  }

  async getConnection(id: number): Promise<Connection | undefined> {
    const { data, error } = await supabase
      .from('connections')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      console.error('Error fetching connection:', error);
      return undefined;
    }

    return data ? this.mapConnectionFromSupabase(data) : undefined;
  }

  async createConnection(connection: InsertConnection): Promise<Connection> {
    // Get the next available ID
    const { data: maxIdData } = await supabase
      .from('connections')
      .select('id')
      .order('id', { ascending: false })
      .limit(1);

    const nextId = maxIdData && maxIdData.length > 0 ? maxIdData[0].id + 1 : 1;

    const { data, error } = await supabase
      .from('connections')
      .insert({
        id: nextId,
        instance: connection.instance,
        token: connection.token,
        host: connection.host,
        client_id: connection.clientId,
        is_active: connection.isActive ?? true
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating connection:', error);
      throw new Error('Failed to create connection');
    }

    return this.mapConnectionFromSupabase(data);
  }

  async updateConnection(id: number, updates: Partial<InsertConnection>): Promise<Connection | undefined> {
    const updateData: any = {};

    if (updates.instance !== undefined) updateData.instance = updates.instance;
    if (updates.token !== undefined) updateData.token = updates.token;
    if (updates.host !== undefined) updateData.host = updates.host;
    if (updates.clientId !== undefined) updateData.client_id = updates.clientId;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('connections')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating connection:', error);
      return undefined;
    }

    return data ? this.mapConnectionFromSupabase(data) : undefined;
  }

  async deleteConnection(id: number): Promise<void> {
    const { error } = await supabase
      .from('connections')
      .delete()
      .eq('id', id);

    if (error) {
      console.error('Error deleting connection:', error);
      throw new Error('Failed to delete connection');
    }
  }

  async validateConnection(host: string, token: string): Promise<{ success: boolean; message?: string }> {
    try {
      // Simular validação - em produção, fazer chamada real para a API
      const response = await fetch(`${host}/status`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        return { success: true, message: 'Conexão validada com sucesso' };
      } else {
        return { success: false, message: 'Falha na autenticação' };
      }
    } catch (error) {
      return { success: false, message: 'Erro ao conectar com o host' };
    }
  }

  private mapConnectionFromSupabase(data: any): Connection {
    return {
      id: data.id,
      instance: data.instance,
      token: data.token,
      host: data.host,
      clientId: data.client_id,
      isActive: data.is_active,
      lastSync: data.last_sync ? new Date(data.last_sync) : null,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Professional Availability operations
  async listProfessionalAvailability(professionalId?: string): Promise<ProfessionalAvailability[]> {
    try {
      let query = supabase
        .from('professional_availability')
        .select('*')
        .eq('is_active', true);

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error } = await query.order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error listing professional availability:', error);
        return [];
      }

      return data?.map(this.mapProfessionalAvailabilityFromSupabase) || [];
    } catch (error) {
      console.error('Error in listProfessionalAvailability:', error);
      return [];
    }
  }

  async listProfessionalAvailabilityByClient(clientId: string, professionalId?: string): Promise<ProfessionalAvailability[]> {
    try {
      // Primeiro, buscar os profissionais da empresa
      const professionals = await this.listProfessionalsByClient(clientId);
      const professionalIds = professionals.map(p => p.id);

      if (professionalIds.length === 0) {
        return [];
      }

      let query = supabase
        .from('professional_availability')
        .select('*')
        .eq('is_active', true)
        .in('professional_id', professionalIds);

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data, error } = await query.order('day_of_week', { ascending: true });

      if (error) {
        console.error('Error listing professional availability by client:', error);
        return [];
      }

      return data?.map(this.mapProfessionalAvailabilityFromSupabase) || [];
    } catch (error) {
      console.error('Error in listProfessionalAvailabilityByClient:', error);
      return [];
    }
  }

  async getProfessionalAvailability(id: string): Promise<ProfessionalAvailability | undefined> {
    try {
      const { data, error } = await supabase
        .from('professional_availability')
        .select('*')
        .eq('id', id)
        .single();
      
      if (error || !data) {
        console.error('Error getting professional availability:', error);
        return undefined;
      }
      
      return this.mapProfessionalAvailabilityFromSupabase(data);
    } catch (error) {
      console.error('Error in getProfessionalAvailability:', error);
      return undefined;
    }
  }

  async createProfessionalAvailability(availability: InsertProfessionalAvailability): Promise<ProfessionalAvailability> {
    try {
      console.log("🔍 DEBUG - Dados recebidos no storage:", availability);

      const insertData = {
        professional_id: availability.professionalId,
        date: availability.date || null,
        start_time: availability.startTime,
        end_time: availability.endTime,
        is_active: availability.isActive !== undefined ? availability.isActive : true,
        day_of_week: availability.dayOfWeek !== undefined ? availability.dayOfWeek : null,
      };

      console.log("🔍 DEBUG - Dados que serão inseridos no banco:", insertData);

      const { data, error } = await supabase
        .from('professional_availability')
        .insert(insertData)
        .select()
        .single();

      if (error || !data) {
        console.error('Error creating professional availability:', error);
        throw new Error('Failed to create professional availability');
      }

      return this.mapProfessionalAvailabilityFromSupabase(data);
    } catch (error) {
      console.error('Error in createProfessionalAvailability:', error);
      throw error;
    }
  }

  async updateProfessionalAvailability(id: string, updates: Partial<InsertProfessionalAvailability>): Promise<ProfessionalAvailability | undefined> {
    try {
      const updateData: any = {};
      
      if (updates.professionalId !== undefined) updateData.professional_id = updates.professionalId;
      if (updates.date !== undefined) updateData.date = updates.date;
      if (updates.startTime !== undefined) updateData.start_time = updates.startTime;
      if (updates.endTime !== undefined) updateData.end_time = updates.endTime;
      if (updates.isActive !== undefined) updateData.is_active = updates.isActive;
      if (updates.dayOfWeek !== undefined) updateData.day_of_week = updates.dayOfWeek;
      
      const { data, error } = await supabase
        .from('professional_availability')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();
      
      if (error || !data) {
        console.error('Error updating professional availability:', error);
        return undefined;
      }
      
      return this.mapProfessionalAvailabilityFromSupabase(data);
    } catch (error) {
      console.error('Error in updateProfessionalAvailability:', error);
      return undefined;
    }
  }

  async deleteProfessionalAvailability(id: string): Promise<void> {
    try {
      const { error } = await supabase
        .from('professional_availability')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting professional availability:', error);
        throw new Error('Failed to delete professional availability');
      }
    } catch (error) {
      console.error('Error in deleteProfessionalAvailability:', error);
      throw error;
    }
  }

  // Método para atualizar horários mensais
  async updateMonthlyAvailability(professionalId?: string, month?: number, year?: number): Promise<any> {
    try {
      const currentDate = new Date();
      const targetMonth = month || currentDate.getMonth() + 1;
      const targetYear = year || currentDate.getFullYear();

      console.log(`Atualizando horários mensais para ${targetMonth}/${targetYear}`);

      // Buscar horários recorrentes (day_of_week não null)
      let query = supabase
        .from('professional_availability')
        .select('*')
        .not('day_of_week', 'is', null)
        .eq('is_active', true);

      if (professionalId) {
        query = query.eq('professional_id', professionalId);
      }

      const { data: recurringSchedules, error: recurringError } = await query;

      if (recurringError) {
        throw new Error(`Erro ao buscar horários recorrentes: ${recurringError.message}`);
      }

      const results = [];

      for (const schedule of recurringSchedules || []) {
        const monthDates = this.getMonthDatesForDayOfWeek(targetYear, targetMonth - 1, schedule.day_of_week);

        for (const date of monthDates) {
          const dateString = date.toISOString().split('T')[0];

          // Verificar se já existe horário para esta data e horário específico
          const { data: existing } = await supabase
            .from('professional_availability')
            .select('id')
            .eq('professional_id', schedule.professional_id)
            .eq('date', dateString)
            .eq('start_time', schedule.start_time)
            .eq('end_time', schedule.end_time)
            .single();

          if (!existing) {
            // Criar novo horário para a data específica
            const { data: newSchedule, error: createError } = await supabase
              .from('professional_availability')
              .insert({
                professional_id: schedule.professional_id,
                date: dateString,
                day_of_week: null,
                start_time: schedule.start_time,
                end_time: schedule.end_time,
                is_active: true,
              })
              .select()
              .single();

            if (createError) {
              console.error(`Erro ao criar horário para ${dateString}:`, createError);
            } else {
              results.push(newSchedule);
            }
          }
        }
      }

      return {
        success: true,
        message: `${results.length} horários criados para ${targetMonth}/${targetYear}`,
        created: results.length,
        month: targetMonth,
        year: targetYear
      };

    } catch (error) {
      console.error('Error in updateMonthlyAvailability:', error);
      throw error;
    }
  }

  // Método para gerar horários do próximo mês
  async generateNextMonthAvailability(professionalId?: string): Promise<any> {
    const currentDate = new Date();
    const nextMonth = currentDate.getMonth() + 1;
    const nextYear = nextMonth > 11 ? currentDate.getFullYear() + 1 : currentDate.getFullYear();
    const adjustedMonth = nextMonth > 11 ? 0 : nextMonth;

    return this.updateMonthlyAvailability(professionalId, adjustedMonth + 1, nextYear);
  }

  // Método auxiliar para obter todas as datas de um dia da semana em um mês
  private getMonthDatesForDayOfWeek(year: number, month: number, dayOfWeek: number): Date[] {
    const dates: Date[] = [];
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    // Encontrar a primeira ocorrência do dia da semana
    let currentDate = new Date(firstDay);
    while (currentDate.getDay() !== dayOfWeek) {
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Adicionar todas as ocorrências do dia da semana no mês
    while (currentDate <= lastDay) {
      dates.push(new Date(currentDate));
      currentDate.setDate(currentDate.getDate() + 7);
    }

    return dates;
  }

  private mapProfessionalAvailabilityFromSupabase(data: any): ProfessionalAvailability {
    return {
      id: data.id,
      professionalId: data.professional_id,
      date: data.date,
      startTime: data.start_time,
      endTime: data.end_time,
      isActive: data.is_active,
      serviceId: data.service_id || null,
      customPrice: data.custom_price || null,
      customDuration: data.custom_duration || null,
      dayOfWeek: data.day_of_week,
      createdAt: new Date(data.created_at)
    };
  }

  // Subscription Plans operations
  async listSubscriptionPlans(): Promise<SubscriptionPlan[]> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('is_active', true)
      .order('price', { ascending: true });

    if (error) {
      console.error('Error fetching subscription plans:', error);
      return [];
    }

    return data?.map(this.mapSubscriptionPlanFromSupabase) || [];
  }

  async getSubscriptionPlan(id: number): Promise<SubscriptionPlan | undefined> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching subscription plan:', error);
      return undefined;
    }

    return this.mapSubscriptionPlanFromSupabase(data);
  }

  async createSubscriptionPlan(plan: Omit<SubscriptionPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<SubscriptionPlan> {
    const { data, error } = await supabase
      .from('subscription_plans')
      .insert({
        name: plan.name,
        description: plan.description,
        price: plan.price,
        currency: plan.currency,
        billing_cycle: plan.billingCycle,
        max_users: plan.maxUsers,
        max_appointments: plan.maxAppointments,
        max_storage: plan.maxStorage,
        features: plan.features,
        is_active: plan.isActive
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create subscription plan: ${error?.message}`);
    }

    return this.mapSubscriptionPlanFromSupabase(data);
  }

  async updateSubscriptionPlan(id: number, updates: Partial<SubscriptionPlan>): Promise<SubscriptionPlan | undefined> {
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.price !== undefined) updateData.price = updates.price;
    if (updates.currency !== undefined) updateData.currency = updates.currency;
    if (updates.billingCycle !== undefined) updateData.billing_cycle = updates.billingCycle;
    if (updates.maxUsers !== undefined) updateData.max_users = updates.maxUsers;
    if (updates.maxAppointments !== undefined) updateData.max_appointments = updates.maxAppointments;
    if (updates.maxStorage !== undefined) updateData.max_storage = updates.maxStorage;
    if (updates.features !== undefined) updateData.features = updates.features;
    if (updates.isActive !== undefined) updateData.is_active = updates.isActive;

    const { data, error } = await supabase
      .from('subscription_plans')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating subscription plan:', error);
      return undefined;
    }

    return this.mapSubscriptionPlanFromSupabase(data);
  }

  async deleteSubscriptionPlan(id: number): Promise<void> {
    const { error } = await supabase
      .from('subscription_plans')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete subscription plan: ${error.message}`);
    }
  }

  private mapSubscriptionPlanFromSupabase(data: any): SubscriptionPlan {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      price: data.price,
      currency: data.currency,
      billingCycle: data.billing_cycle,
      maxUsers: data.max_users,
      maxAppointments: data.max_appointments,
      maxStorage: data.max_storage,
      features: data.features,
      isActive: data.is_active,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Subscriptions operations
  async listSubscriptions(clientId?: string): Promise<Subscription[]> {
    let query = supabase
      .from('subscriptions')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching subscriptions:', error);
      return [];
    }

    return data?.map(this.mapSubscriptionFromSupabase) || [];
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching subscription:', error);
      return undefined;
    }

    return this.mapSubscriptionFromSupabase(data);
  }

  async getSubscriptionByClient(clientId: string): Promise<Subscription | undefined> {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('client_id', clientId)
      .eq('status', 'ACTIVE')
      .single();

    if (error || !data) {
      return undefined;
    }

    return this.mapSubscriptionFromSupabase(data);
  }

  async createSubscription(subscription: Omit<Subscription, 'id' | 'createdAt' | 'updatedAt'>): Promise<Subscription> {
    const { data, error } = await supabase
      .from('subscriptions')
      .insert({
        client_id: subscription.clientId,
        plan_id: Number(subscription.planId), // Explicitly cast to number
        status: subscription.status,
        current_period_start: subscription.currentPeriodStart.toISOString(),
        current_period_end: subscription.currentPeriodEnd.toISOString(),
        trial_start: subscription.trialStart?.toISOString(),
        trial_end: subscription.trialEnd?.toISOString(),
        canceled_at: subscription.canceledAt?.toISOString(),
        cancel_at_period_end: subscription.cancelAtPeriodEnd,
        asaas_subscription_id: subscription.asaasSubscriptionId,
        asaas_customer_id: subscription.asaasCustomerId
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create subscription: ${error?.message}`);
    }

    return this.mapSubscriptionFromSupabase(data);
  }

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription | undefined> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.currentPeriodStart !== undefined) updateData.current_period_start = updates.currentPeriodStart.toISOString();
    if (updates.currentPeriodEnd !== undefined) updateData.current_period_end = updates.currentPeriodEnd.toISOString();
    if (updates.trialStart !== undefined) updateData.trial_start = updates.trialStart?.toISOString();
    if (updates.trialEnd !== undefined) updateData.trial_end = updates.trialEnd?.toISOString();
    if (updates.canceledAt !== undefined) updateData.canceled_at = updates.canceledAt?.toISOString();
    if (updates.cancelAtPeriodEnd !== undefined) updateData.cancel_at_period_end = updates.cancelAtPeriodEnd;
    if (updates.asaasSubscriptionId !== undefined) updateData.asaas_subscription_id = updates.asaasSubscriptionId;
    if (updates.asaasCustomerId !== undefined) updateData.asaas_customer_id = updates.asaasCustomerId;

    const { data, error } = await supabase
      .from('subscriptions')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating subscription:', error);
      return undefined;
    }

    return this.mapSubscriptionFromSupabase(data);
  }

  async cancelSubscription(id: string): Promise<void> {
    const { error } = await supabase
      .from('subscriptions')
      .update({
        status: 'CANCELED',
        canceled_at: new Date().toISOString()
      })
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to cancel subscription: ${error.message}`);
    }
  }

  private mapSubscriptionFromSupabase(data: any): Subscription {
    return {
      id: data.id,
      clientId: data.client_id,
      planId: data.plan_id,
      status: data.status,
      currentPeriodStart: new Date(data.current_period_start),
      currentPeriodEnd: new Date(data.current_period_end),
      trialStart: data.trial_start ? new Date(data.trial_start) : undefined,
      trialEnd: data.trial_end ? new Date(data.trial_end) : undefined,
      canceledAt: data.canceled_at ? new Date(data.canceled_at) : undefined,
      cancelAtPeriodEnd: data.cancel_at_period_end,
      asaasSubscriptionId: data.asaas_subscription_id,
      asaasCustomerId: data.asaas_customer_id,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Invoices operations
  async listInvoices(clientId?: string): Promise<Invoice[]> {
    let query = supabase
      .from('invoices')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching invoices:', error);
      return [];
    }

    return data?.map(this.mapInvoiceFromSupabase) || [];
  }

  async getInvoice(id: string): Promise<Invoice | undefined> {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching invoice:', error);
      return undefined;
    }

    return this.mapInvoiceFromSupabase(data);
  }

  async createInvoice(invoice: Omit<Invoice, 'id' | 'createdAt' | 'updatedAt'>): Promise<Invoice> {
    const { data, error } = await supabase
      .from('invoices')
      .insert({
        client_id: invoice.clientId,
        subscription_id: invoice.subscriptionId,
        amount: invoice.amount,
        currency: invoice.currency,
        status: invoice.status,
        description: invoice.description,
        due_date: invoice.dueDate?.toISOString(),
        paid_at: invoice.paidAt?.toISOString(),
        asaas_charge_id: invoice.asaasChargeId,
        asaas_invoice_url: invoice.asaasInvoiceUrl,
        asaas_bank_slip_url: invoice.asaasBankSlipUrl,
        asaas_pix_qr_code: invoice.asaasPixQrCode,
        asaas_pix_copy_paste: invoice.asaasPixCopyPaste,
        payment_method: invoice.paymentMethod,
        installment_count: invoice.installmentCount,
        installment_value: invoice.installmentValue
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create invoice: ${error?.message}`);
    }

    return this.mapInvoiceFromSupabase(data);
  }

  async updateInvoice(id: string, updates: Partial<Invoice>): Promise<Invoice | undefined> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.dueDate !== undefined) updateData.due_date = updates.dueDate?.toISOString();
    if (updates.paidAt !== undefined) updateData.paid_at = updates.paidAt?.toISOString();
    if (updates.asaasChargeId !== undefined) updateData.asaas_charge_id = updates.asaasChargeId;
    if (updates.asaasInvoiceUrl !== undefined) updateData.asaas_invoice_url = updates.asaasInvoiceUrl;
    if (updates.asaasBankSlipUrl !== undefined) updateData.asaas_bank_slip_url = updates.asaasBankSlipUrl;
    if (updates.asaasPixQrCode !== undefined) updateData.asaas_pix_qr_code = updates.asaasPixQrCode;
    if (updates.asaasPixCopyPaste !== undefined) updateData.asaas_pix_copy_paste = updates.asaasPixCopyPaste;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;

    const { data, error } = await supabase
      .from('invoices')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating invoice:', error);
      return undefined;
    }

    return this.mapInvoiceFromSupabase(data);
  }

  async deleteInvoice(id: string): Promise<void> {
    const { error } = await supabase
      .from('invoices')
      .delete()
      .eq('id', id);

    if (error) {
      throw new Error(`Failed to delete invoice: ${error.message}`);
    }
  }

  private mapInvoiceFromSupabase(data: any): Invoice {
    return {
      id: data.id,
      clientId: data.client_id,
      subscriptionId: data.subscription_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      description: data.description,
      dueDate: data.due_date ? new Date(data.due_date) : undefined,
      paidAt: data.paid_at ? new Date(data.paid_at) : undefined,
      asaasChargeId: data.asaas_charge_id,
      asaasInvoiceUrl: data.asaas_invoice_url,
      asaasBankSlipUrl: data.asaas_bank_slip_url,
      asaasPixQrCode: data.asaas_pix_qr_code,
      asaasPixCopyPaste: data.asaas_pix_copy_paste,
      paymentMethod: data.payment_method,
      installmentCount: data.installment_count,
      installmentValue: data.installment_value,
      createdAt: new Date(data.created_at),
      updatedAt: new Date(data.updated_at)
    };
  }

  // Payments operations
  async listPayments(clientId?: string): Promise<Payment[]> {
    let query = supabase
      .from('payments')
      .select('*')
      .order('created_at', { ascending: false });

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching payments:', error);
      return [];
    }

    return data?.map(this.mapPaymentFromSupabase) || [];
  }

  async getPayment(id: string): Promise<Payment | undefined> {
    const { data, error } = await supabase
      .from('payments')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !data) {
      console.error('Error fetching payment:', error);
      return undefined;
    }

    return this.mapPaymentFromSupabase(data);
  }

  async createPayment(payment: Omit<Payment, 'id' | 'createdAt'>): Promise<Payment> {
    const { data, error } = await supabase
      .from('payments')
      .insert({
        client_id: payment.clientId,
        invoice_id: payment.invoiceId,
        amount: payment.amount,
        currency: payment.currency,
        status: payment.status,
        payment_method: payment.paymentMethod,
        asaas_payment_id: payment.asaasPaymentId,
        asaas_transaction_receipt_url: payment.asaasTransactionReceiptUrl,
        failure_reason: payment.failureReason,
        processed_at: payment.processedAt?.toISOString()
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error(`Failed to create payment: ${error?.message}`);
    }

    return this.mapPaymentFromSupabase(data);
  }

  async updatePayment(id: string, updates: Partial<Payment>): Promise<Payment | undefined> {
    const updateData: any = {};
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.paymentMethod !== undefined) updateData.payment_method = updates.paymentMethod;
    if (updates.asaasPaymentId !== undefined) updateData.asaas_payment_id = updates.asaasPaymentId;
    if (updates.asaasTransactionReceiptUrl !== undefined) updateData.asaas_transaction_receipt_url = updates.asaasTransactionReceiptUrl;
    if (updates.failureReason !== undefined) updateData.failure_reason = updates.failureReason;
    if (updates.processedAt !== undefined) updateData.processed_at = updates.processedAt?.toISOString();

    const { data, error } = await supabase
      .from('payments')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error || !data) {
      console.error('Error updating payment:', error);
      return undefined;
    }

    return this.mapPaymentFromSupabase(data);
  }

  private mapPaymentFromSupabase(data: any): Payment {
    return {
      id: data.id,
      clientId: data.client_id,
      invoiceId: data.invoice_id,
      amount: data.amount,
      currency: data.currency,
      status: data.status,
      paymentMethod: data.payment_method,
      asaasPaymentId: data.asaas_payment_id,
      asaasTransactionReceiptUrl: data.asaas_transaction_receipt_url,
      failureReason: data.failure_reason,
      processedAt: data.processed_at ? new Date(data.processed_at) : undefined,
      createdAt: new Date(data.created_at)
    };
  }
}

export const storage = new ClientsAuthStorage();
