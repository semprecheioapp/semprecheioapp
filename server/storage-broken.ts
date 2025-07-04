import { users, sessions, clients, type User, type InsertUser, type Session, type Client, type InsertClient } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";
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

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private sessions: Map<string, Session>;
  private clients: Map<string, Client>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.clients = new Map();
    this.currentId = 1;
    
    // Initialize test users and clients
    this.initializeTestUsers();
    this.initializeTestClients();
  }

  private initializeTestClients() {
    // Real client data provided by user
    const clinicaMBK: Client = {
      id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      name: 'Clínica MBK',
      email: 'agenciambkautomac@gmail.com',
      phone: '556699618890',
      createdAt: new Date('2025-05-15 08:39:57.684331'),
      isActive: true,
      serviceType: 'clinica',
      whatsappInstanceUrl: 'megacode-MTflBsUXacp',
      settings: null,
      assistantId: 'asst_z5VR0QuThXhA9YR9W1RoqL7q',
      password: 'senha123'
    };

    this.clients.set(clinicaMBK.id, clinicaMBK);
  }

  private async initializeTestUsers() {
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    const superAdmin: User = {
      id: 1,
      name: "Super Administrador",
      email: "super@admin.com",
      password: hashedPassword,
      role: "super_admin",
      createdAt: new Date(),
    };
    
    const admin: User = {
      id: 2,
      name: "Administrador",
      email: "admin@salon.com",
      password: hashedPassword,
      role: "admin",
      createdAt: new Date(),
    };
    
    this.users.set(superAdmin.id, superAdmin);
    this.users.set(admin.id, admin);
  }

  private initializeTestClients() {
    // Real client data provided by user
    const clinicaMBK: Client = {
      id: '165bc915-45bc-423e-ac8f-7a60a3bf9b05',
      name: 'Clínica MBK',
      email: 'agenciambkautomac@gmail.com',
      phone: '556699618890',
      createdAt: new Date('2025-05-15 08:39:57.684331'),
      isActive: true,
      serviceType: 'clinica',
      whatsappInstanceUrl: 'megacode-MTflBsUXacp',
      settings: null,
      assistantId: 'asst_z5VR0QuThXhA9YR9W1RoqL7q',
      password: 'senha123' // Will be hashed in real implementation
    };

    this.clients.set(clinicaMBK.id, clinicaMBK);
  }

  private async initializeTestUsers() {
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    const superAdmin: User = {
      id: this.currentId++,
      name: "Super Administrador",
      email: "super@admin.com",
      password: hashedPassword,
      role: "Super Admin",
      createdAt: new Date(),
    };
    
    const admin: User = {
      id: this.currentId++,
      name: "Administrador",
      email: "admin@salon.com", 
      password: hashedPassword,
      role: "Admin",
      createdAt: new Date(),
    };
    
    this.users.set(superAdmin.id, superAdmin);
    this.users.set(admin.id, admin);
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const id = this.currentId++;
    const user: User = { 
      id, 
      name: insertUser.name,
      email: insertUser.email,
      password: hashedPassword,
      role: insertUser.role || "user",
      createdAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async validateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    if (!user) return null;
    
    const isValid = await bcrypt.compare(password, user.password);
    return isValid ? user : null;
  }

  async createSession(userId: number, expiresAt: Date): Promise<Session> {
    const sessionId = Math.random().toString(36).substring(2, 15) + 
                     Math.random().toString(36).substring(2, 15);
    
    const session: Session = {
      id: sessionId,
      userId,
      expiresAt,
      createdAt: new Date(),
    };
    
    this.sessions.set(sessionId, session);
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    
    // Check if session is expired
    if (session.expiresAt < new Date()) {
      this.sessions.delete(sessionId);
      return undefined;
    }
    
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;
    
    return this.getUser(session.userId);
  }

  // Client operations
  async getClient(id: string): Promise<Client | undefined> {
    return this.clients.get(id);
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    return Array.from(this.clients.values()).find(
      (client) => client.email === email,
    );
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const hashedPassword = insertClient.password 
      ? await bcrypt.hash(insertClient.password, 10) 
      : null;
    
    const id = crypto.randomUUID();
    const client: Client = {
      id,
      name: insertClient.name,
      email: insertClient.email,
      phone: insertClient.phone || null,
      createdAt: new Date(),
      isActive: true,
      serviceType: insertClient.serviceType || null,
      whatsappInstanceUrl: insertClient.whatsappInstanceUrl || null,
      settings: insertClient.settings || null,
      assistantId: insertClient.assistantId || null,
      password: hashedPassword,
    };
    
    this.clients.set(id, client);
    return client;
  }

  async validateClient(email: string, password: string): Promise<Client | null> {
    const client = await this.getClientByEmail(email);
    if (!client || !client.password) return null;
    
    const isValid = await bcrypt.compare(password, client.password);
    return isValid ? client : null;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const client = this.clients.get(id);
    if (!client) return undefined;

    const updatedClient: Client = {
      ...client,
      ...updates,
      id: client.id, // Keep original ID
      createdAt: client.createdAt, // Keep original creation date
    };

    this.clients.set(id, updatedClient);
    return updatedClient;
  }

  async deleteClient(id: string): Promise<void> {
    this.clients.delete(id);
  }

  async listClients(): Promise<Client[]> {
    return Array.from(this.clients.values())
      .filter(client => client.isActive)
      .sort((a, b) => {
        const aDate = a.createdAt ? new Date(a.createdAt).getTime() : 0;
        const bDate = b.createdAt ? new Date(b.createdAt).getTime() : 0;
        return bDate - aDate; // Most recent first
      });
  }
}

export const storage = new MemStorage();
