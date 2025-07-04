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
  type InsertCustomer
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
  createClient(client: InsertClient): Promise<Client>;
  validateClient(email: string, password: string): Promise<Client | null>;
  updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined>;
  deleteClient(id: string): Promise<void>;
  listClients(): Promise<Client[]>;

  // Professional operations
  listProfessionals(): Promise<Professional[]>;
  getProfessional(id: string): Promise<Professional | undefined>;
  createProfessional(professional: InsertProfessional): Promise<Professional>;
  updateProfessional(id: string, updates: Partial<InsertProfessional>): Promise<Professional | undefined>;
  deleteProfessional(id: string): Promise<void>;

  // Specialty operations
  listSpecialties(): Promise<Specialty[]>;
  getSpecialty(id: string): Promise<Specialty | undefined>;
  createSpecialty(specialty: InsertSpecialty): Promise<Specialty>;

  // Service operations
  listServices(): Promise<Service[]>;
  getService(id: string): Promise<Service | undefined>;
  createService(service: InsertService): Promise<Service>;

  // Appointment operations
  listAppointments(filters?: { date?: Date, professionalId?: string, clientId?: string }): Promise<Appointment[]>;
  getAppointment(id: string): Promise<Appointment | undefined>;
  createAppointment(appointment: InsertAppointment): Promise<Appointment>;
  updateAppointment(id: string, updates: Partial<InsertAppointment>): Promise<Appointment | undefined>;
  deleteAppointment(id: string): Promise<void>;

  // Customer operations
  listCustomers(clientId?: string): Promise<Customer[]>;
  getCustomer(id: string): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
}

export class SupabaseRealStorage implements IStorage {
  constructor() {
    this.initializeTestData();
  }

  private async initializeTestData() {
    // Check if we already have users, if not, create test users
    const { data: users } = await supabase.from('users').select('*').limit(1);
    if (!users || users.length === 0) {
      await this.seedInitialData();
    }
  }

  private async seedInitialData() {
    try {
      // Create test users
      const hashedPassword = await bcrypt.hash('123456', 10);
      
      const { data: superAdmin } = await supabase.from('users').insert({
        name: 'Super Administrador',
        email: 'admin@semprecheioappp.com',
        password: hashedPassword,
        role: 'super_admin'
      }).select().single();

      const { data: admin } = await supabase.from('users').insert({
        name: 'Administrador',
        email: 'admin@clinicambk.com',
        password: hashedPassword,
        role: 'admin'
      }).select().single();

      // Create test client
      const { data: client } = await supabase.from('clients').insert({
        name: 'Clínica MBK',
        email: 'agenciambkautomac@gmail.com',
        phone: '556699618890',
        service_type: 'clinica_estetica',
        is_active: true
      }).select().single();

      console.log('Test data seeded successfully');
    } catch (error) {
      console.error('Error seeding test data:', error);
    }
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    if (error || !data) return undefined;
    return data as User;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert({
        name: insertUser.name,
        email: insertUser.email,
        password: hashedPassword,
        role: insertUser.role || 'user'
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create user');
    }

    return data as User;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createSession(userId: number, expiresAt: Date): Promise<Session> {
    const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const { data, error } = await supabase
      .from('sessions')
      .insert({
        id: sessionId,
        user_id: userId,
        expires_at: expiresAt.toISOString()
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create session');
    }

    return {
      id: data.id,
      userId: data.user_id,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at)
    } as Session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const { data, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    if (error || !data) return undefined;
    
    return {
      id: data.id,
      userId: data.user_id,
      expiresAt: new Date(data.expires_at),
      createdAt: new Date(data.created_at)
    } as Session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await supabase.from('sessions').delete().eq('id', sessionId);
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const session = await this.getSession(sessionId);
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await this.deleteSession(sessionId);
      }
      return undefined;
    }
    
    return this.getUser(session.userId);
  }

  // Client operations
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
      .eq('email', email)
      .single();
    
    if (error || !data) return undefined;
    return this.mapClientFromSupabase(data);
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
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
        password: insertClient.password,
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
    const { data, error } = await supabase
      .from('clients')
      .update({
        name: updates.name,
        email: updates.email,
        phone: updates.phone,
        service_type: updates.serviceType,
        whatsapp_instance_url: updates.whatsappInstanceUrl,
        settings: updates.settings,
        assistant_id: updates.assistantId,
        password: updates.password,
        is_active: updates.isActive
      })
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
      .select('*')
      .eq('is_active', true)
      .order('name');
    
    if (error || !data) return [];
    return data.map(this.mapProfessionalFromSupabase);
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

  async listProfessionalsByClient(clientId: string): Promise<Professional[]> {
    const { data, error } = await supabase
      .from('professionals')
      .select('*')
      .eq('client_id', clientId)
      .eq('is_active', true)
      .order('name');

    if (error || !data) return [];
    return data.map(this.mapProfessionalFromSupabase);
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
        is_active: specialty.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create specialty');
    }

    return this.mapSpecialtyFromSupabase(data);
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
    const { data, error } = await supabase
      .from('services')
      .insert({
        name: service.name,
        description: service.description,
        duration: service.duration,
        price: service.price,
        specialty_id: service.specialtyId,
        is_active: service.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create service');
    }

    return this.mapServiceFromSupabase(data);
  }

  // Appointment operations
  async listAppointments(filters?: { date?: Date, professionalId?: string, clientId?: string }): Promise<Appointment[]> {
    let query = supabase.from('appointments').select('*').order('scheduled_at');

    if (filters?.date) {
      const startOfDay = new Date(filters.date);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(filters.date);
      endOfDay.setHours(23, 59, 59, 999);
      
      query = query.gte('scheduled_at', startOfDay.toISOString()).lte('scheduled_at', endOfDay.toISOString());
    }

    if (filters?.professionalId) {
      query = query.eq('professional_id', filters.professionalId);
    }

    if (filters?.clientId) {
      query = query.eq('client_id', filters.clientId);
    }

    const { data, error } = await query;
    
    if (error || !data) return [];
    return data.map(this.mapAppointmentFromSupabase);
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

  async createAppointment(appointment: InsertAppointment): Promise<Appointment> {
    const { data, error } = await supabase
      .from('appointments')
      .insert({
        client_id: appointment.clientId,
        professional_id: appointment.professionalId,
        service_id: appointment.serviceId,
        scheduled_at: appointment.scheduledAt.toISOString(),
        duration: appointment.duration,
        status: appointment.status || 'scheduled',
        notes: appointment.notes
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create appointment');
    }

    return this.mapAppointmentFromSupabase(data);
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

  // Customer operations
  async listCustomers(clientId?: string): Promise<Customer[]> {
    let query = supabase.from('customers').select('*').eq('is_active', true).order('name');

    if (clientId) {
      query = query.eq('client_id', clientId);
    }

    const { data, error } = await query;
    
    if (error || !data) return [];
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

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const { data, error } = await supabase
      .from('customers')
      .insert({
        name: customer.name,
        email: customer.email,
        phone: customer.phone,
        client_id: customer.clientId,
        is_active: customer.isActive ?? true
      })
      .select()
      .single();

    if (error || !data) {
      throw new Error('Failed to create customer');
    }

    return this.mapCustomerFromSupabase(data);
  }

  // Helper methods to map Supabase data to our types
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
      password: data.password
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

  private mapSpecialtyFromSupabase(data: any): Specialty {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      color: data.color,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }

  private mapServiceFromSupabase(data: any): Service {
    return {
      id: data.id,
      name: data.name,
      description: data.description,
      duration: data.duration,
      price: data.price,
      specialtyId: data.specialty_id,
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
      clientId: data.client_id,
      isActive: data.is_active,
      createdAt: new Date(data.created_at)
    };
  }
}

export const storage = new SupabaseRealStorage();