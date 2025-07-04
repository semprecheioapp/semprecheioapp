import { users, sessions, clients, type User, type InsertUser, type Session, type Client, type InsertClient } from "@shared/schema";
import { supabase } from "./supabase";
import bcrypt from "bcryptjs";

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
}

export class SupabaseStorage implements IStorage {
  constructor() {
    this.initializeTestData();
  }

  private async initializeTestData() {
    try {
      // Check if users table exists and has data
      const { data: existingUsers } = await supabase
        .from('users')
        .select('id')
        .limit(1);
      
      if (!existingUsers || existingUsers.length === 0) {
        await this.seedInitialData();
      }
    } catch (error) {
      console.log("Database not ready yet, will seed later:", error);
    }
  }

  private async seedInitialData() {
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    // Create super admin and admin users
    await supabase.from('users').insert([
      {
        id: 1,
        name: "Super Administrador",
        email: "superadmin@semprecheio.com",
        password: hashedPassword,
        role: "super_admin"
      },
      {
        id: 2,
        name: "Administrador",
        email: "admin@semprecheio.com", 
        password: hashedPassword,
        role: "admin"
      }
    ]);

    // Create the clinic client
    await supabase.from('clients').insert([
      {
        id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
        name: 'Clínica MBK',
        email: 'agenciambkautomac@gmail.com',
        phone: '556699618890',
        password: hashedPassword,
        serviceType: 'Estética e Beleza',
        whatsappInstanceUrl: 'https://api.whatsapp.com/instance/mbk',
        settings: { 
          workingHours: { start: '08:00', end: '18:00' },
          services: ['Limpeza de Pele', 'Massagem', 'Tratamentos Faciais']
        },
        assistantId: 'asst_mbk_clinic_001',
        isActive: true
      }
    ]);
  }

  async getUser(id: number): Promise<User | undefined> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('id', id)
      .single();
    
    return data || undefined;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const { data } = await supabase
      .from('users')
      .select('*')
      .eq('email', email)
      .single();
    
    return data || undefined;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    
    const { data, error } = await supabase
      .from('users')
      .insert([{ ...insertUser, password: hashedPassword }])
      .select()
      .single();
    
    if (error) throw error;
    return data;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createSession(userId: number, expiresAt: Date): Promise<Session> {
    const sessionId = crypto.randomUUID();
    
    const { data, error } = await supabase
      .from('sessions')
      .insert([{
        id: sessionId,
        userId,
        expiresAt: expiresAt.toISOString(),
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, expiresAt: new Date(data.expiresAt), createdAt: new Date(data.createdAt) };
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const { data } = await supabase
      .from('sessions')
      .select('*')
      .eq('id', sessionId)
      .single();
    
    return data ? { ...data, expiresAt: new Date(data.expiresAt), createdAt: new Date(data.createdAt) } : undefined;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await supabase
      .from('sessions')
      .delete()
      .eq('id', sessionId);
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const { data } = await supabase
      .from('sessions')
      .select(`
        *,
        users (*)
      `)
      .eq('id', sessionId)
      .single();
    
    return data?.users || undefined;
  }

  async getClient(id: string): Promise<Client | undefined> {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('id', id)
      .single();
    
    return data ? { ...data, createdAt: new Date(data.createdAt) } : undefined;
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .eq('email', email)
      .single();
    
    return data ? { ...data, createdAt: new Date(data.createdAt) } : undefined;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const clientId = crypto.randomUUID();
    const hashedPassword = insertClient.password ? await bcrypt.hash(insertClient.password, 10) : null;
    
    const { data, error } = await supabase
      .from('clients')
      .insert([{ 
        id: clientId,
        ...insertClient, 
        password: hashedPassword,
        createdAt: new Date().toISOString()
      }])
      .select()
      .single();
    
    if (error) throw error;
    return { ...data, createdAt: new Date(data.createdAt) };
  }

  async validateClient(email: string, password: string): Promise<Client | null> {
    const client = await this.getClientByEmail(email);
    if (!client || !client.password) return null;
    
    const isValid = await bcrypt.compare(password, client.password);
    return isValid ? client : null;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const updateData = { ...updates };
    if (updates.password) {
      updateData.password = await bcrypt.hash(updates.password, 10);
    }
    
    const { data, error } = await supabase
      .from('clients')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) throw error;
    return data ? { ...data, createdAt: new Date(data.createdAt) } : undefined;
  }

  async deleteClient(id: string): Promise<void> {
    await supabase
      .from('clients')
      .delete()
      .eq('id', id);
  }

  async listClients(): Promise<Client[]> {
    const { data } = await supabase
      .from('clients')
      .select('*')
      .order('createdAt', { ascending: false });
    
    return data ? data.map(client => ({ ...client, createdAt: new Date(client.createdAt) })) : [];
  }
}

export const storage = new SupabaseStorage();