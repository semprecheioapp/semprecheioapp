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

export class DatabaseStorage implements IStorage {
  constructor() {
    this.initializeTestData();
  }

  private async initializeTestData() {
    try {
      const existingUsers = await db.select().from(users).limit(1);
      if (existingUsers.length === 0) {
        await this.seedInitialData();
      }
    } catch (error) {
      console.log("Database not ready yet, will seed later");
    }
  }

  private async seedInitialData() {
    const hashedPassword = await bcrypt.hash("123456", 10);
    
    // Create super admin and admin users
    await db.insert(users).values([
      {
        id: 1,
        name: "Super Administrador",
        email: "super@admin.com",
        password: hashedPassword,
        role: "super_admin",
        createdAt: new Date(),
      },
      {
        id: 2,
        name: "Administrador",
        email: "admin@salon.com",
        password: hashedPassword,
        role: "admin",
        createdAt: new Date(),
      }
    ]).onConflictDoNothing();

    // Create Clínica MBK client
    await db.insert(clients).values({
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
    }).onConflictDoNothing();
  }

  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const hashedPassword = await bcrypt.hash(insertUser.password, 10);
    const [user] = await db
      .insert(users)
      .values({
        ...insertUser,
        password: hashedPassword,
        role: insertUser.role || "user",
        createdAt: new Date(),
      })
      .returning();
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
    
    const [session] = await db
      .insert(sessions)
      .values({
        id: sessionId,
        userId,
        expiresAt,
        createdAt: new Date(),
      })
      .returning();
    
    return session;
  }

  async getSession(sessionId: string): Promise<Session | undefined> {
    const [session] = await db.select().from(sessions).where(eq(sessions.id, sessionId));
    if (!session || session.expiresAt < new Date()) {
      if (session) {
        await db.delete(sessions).where(eq(sessions.id, sessionId));
      }
      return undefined;
    }
    return session;
  }

  async deleteSession(sessionId: string): Promise<void> {
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }

  async getUserBySessionId(sessionId: string): Promise<User | undefined> {
    const session = await this.getSession(sessionId);
    if (!session) return undefined;
    
    return this.getUser(session.userId);
  }

  async getClient(id: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.id, id));
    return client;
  }

  async getClientByEmail(email: string): Promise<Client | undefined> {
    const [client] = await db.select().from(clients).where(eq(clients.email, email));
    return client;
  }

  async createClient(insertClient: InsertClient): Promise<Client> {
    const [client] = await db
      .insert(clients)
      .values({
        ...insertClient,
        id: Math.random().toString(36).substring(2, 15),
        isActive: insertClient.isActive ?? true,
        createdAt: new Date(),
      })
      .returning();
    
    return client;
  }

  async validateClient(email: string, password: string): Promise<Client | null> {
    const client = await this.getClientByEmail(email);
    if (!client) return null;
    
    return client.password === password ? client : null;
  }

  async updateClient(id: string, updates: Partial<InsertClient>): Promise<Client | undefined> {
    const [client] = await db
      .update(clients)
      .set(updates)
      .where(eq(clients.id, id))
      .returning();
    
    return client;
  }

  async deleteClient(id: string): Promise<void> {
    await db.delete(clients).where(eq(clients.id, id));
  }

  async listClients(): Promise<Client[]> {
    return await db.select().from(clients);
  }
}

export const storage = new DatabaseStorage();