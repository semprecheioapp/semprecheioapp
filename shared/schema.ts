import { pgTable, text, serial, integer, boolean, timestamp, uuid, varchar, jsonb, time, decimal } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { sql } from "drizzle-orm";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const sessions = pgTable("sessions", {
  id: text("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

// Configurações globais do sistema
export const systemSettings = pgTable("system_settings", {
  id: serial("id").primaryKey(),
  key: varchar("key", { length: 100 }).notNull().unique(),
  value: jsonb("value").notNull(),
  description: text("description"),
  category: varchar("category", { length: 50 }).default("general"),
  isPublic: boolean("is_public").default(false), // se pode ser acessado por clientes
  updatedAt: timestamp("updated_at").defaultNow(),
  updatedBy: text("updated_by"), // email do usuário que atualizou
});

// Auditoria de ações do sistema
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  clientId: uuid("client_id").references(() => clients.id),
  userId: text("user_id"), // pode ser email ou ID
  action: varchar("action", { length: 100 }).notNull(), // CREATE, UPDATE, DELETE, LOGIN, etc
  resource: varchar("resource", { length: 100 }).notNull(), // appointments, clients, users, etc
  resourceId: text("resource_id"), // ID do recurso afetado
  oldValues: jsonb("old_values"), // valores anteriores
  newValues: jsonb("new_values"), // novos valores
  ipAddress: varchar("ip_address", { length: 45 }),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
  success: boolean("success").default(true),
  errorMessage: text("error_message"),
});

// Sistema de assinaturas e planos
export const subscriptionPlans = pgTable("subscription_plans", {
  id: serial("id").primaryKey(),
  name: varchar("name", { length: 100 }).notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  billingCycle: varchar("billing_cycle", { length: 20 }).notNull(), // monthly, yearly
  maxUsers: integer("max_users").notNull(),
  maxAppointments: integer("max_appointments").notNull(),
  maxStorage: integer("max_storage").notNull(), // GB
  features: jsonb("features"), // lista de funcionalidades
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Assinaturas dos clientes
export const subscriptions = pgTable("subscriptions", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  planId: integer("plan_id").notNull().references(() => subscriptionPlans.id),
  status: varchar("status", { length: 20 }).notNull(), // ACTIVE, EXPIRED, CANCELED
  currentPeriodStart: timestamp("current_period_start").notNull(),
  currentPeriodEnd: timestamp("current_period_end").notNull(),
  trialStart: timestamp("trial_start"),
  trialEnd: timestamp("trial_end"),
  canceledAt: timestamp("canceled_at"),
  cancelAtPeriodEnd: boolean("cancel_at_period_end").default(false),
  asaasSubscriptionId: text("asaas_subscription_id"), // ID da assinatura no Asaas
  asaasCustomerId: text("asaas_customer_id"), // ID do cliente no Asaas
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Faturas/Cobranças
export const invoices = pgTable("invoices", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  subscriptionId: uuid("subscription_id").references(() => subscriptions.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  status: varchar("status", { length: 20 }).notNull(), // PENDING, RECEIVED, CONFIRMED, OVERDUE, REFUNDED, RECEIVED_IN_CASH, REFUND_REQUESTED, REFUND_IN_PROGRESS, CHARGEBACK_REQUESTED, CHARGEBACK_DISPUTE, AWAITING_CHARGEBACK_REVERSAL, DUNNING_REQUESTED, DUNNING_RECEIVED, AWAITING_RISK_ANALYSIS
  description: text("description"),
  dueDate: timestamp("due_date"),
  paidAt: timestamp("paid_at"),
  asaasChargeId: text("asaas_charge_id"), // ID da cobrança no Asaas
  asaasInvoiceUrl: text("asaas_invoice_url"), // URL da fatura no Asaas
  asaasBankSlipUrl: text("asaas_bank_slip_url"), // URL do boleto
  asaasPixQrCode: text("asaas_pix_qr_code"), // QR Code do PIX
  asaasPixCopyPaste: text("asaas_pix_copy_paste"), // Código PIX copia e cola
  paymentMethod: varchar("payment_method", { length: 50 }), // BOLETO, CREDIT_CARD, PIX, UNDEFINED
  installmentCount: integer("installment_count").default(1),
  installmentValue: decimal("installment_value", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Histórico de pagamentos
export const payments = pgTable("payments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").notNull().references(() => clients.id),
  invoiceId: uuid("invoice_id").references(() => invoices.id),
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  currency: varchar("currency", { length: 3 }).default("BRL"),
  status: varchar("status", { length: 20 }).notNull(), // RECEIVED, PENDING, CONFIRMED
  paymentMethod: varchar("payment_method", { length: 50 }),
  asaasPaymentId: text("asaas_payment_id"), // ID do pagamento no Asaas
  asaasTransactionReceiptUrl: text("asaas_transaction_receipt_url"),
  failureReason: text("failure_reason"),
  processedAt: timestamp("processed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const clients = pgTable("clients", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  createdAt: timestamp("created_at").defaultNow(),
  isActive: boolean("is_active").default(true),
  serviceType: varchar("service_type", { length: 50 }),
  whatsappInstanceUrl: varchar("whatsapp_instance_url", { length: 255 }),
  settings: jsonb("settings"),
  assistantId: text("assistant_id"),
  password: varchar("password"),
  promptIa: text("prompt_ia"),
  agentName: varchar("agent_name", { length: 255 }),
  // Configurações específicas por empresa
  plan: varchar("plan", { length: 50 }).default("basic"), // basic, pro, enterprise
  maxUsers: integer("max_users").default(5),
  maxAppointments: integer("max_appointments").default(100),
  maxStorage: integer("max_storage").default(1), // GB
  customDomain: varchar("custom_domain", { length: 255 }),
  brandingSettings: jsonb("branding_settings"), // cores, logo, etc
  businessHours: jsonb("business_hours"), // horários de funcionamento
  timezone: varchar("timezone", { length: 50 }).default("America/Sao_Paulo"),
  language: varchar("language", { length: 10 }).default("pt-BR"),
  currency: varchar("currency", { length: 10 }).default("BRL"),
  // Configurações de segurança
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  sessionTimeout: integer("session_timeout").default(24), // horas
  // Configurações de notificações
  emailNotifications: boolean("email_notifications").default(true),
  smsNotifications: boolean("sms_notifications").default(false),
  whatsappNotifications: boolean("whatsapp_notifications").default(true),
  // Configurações de backup
  autoBackup: boolean("auto_backup").default(true),
  backupFrequency: varchar("backup_frequency", { length: 20 }).default("daily"),
  // Configurações de integração
  integrations: jsonb("integrations"), // APIs externas, webhooks, etc
  // Configurações de compliance
  gdprCompliant: boolean("gdpr_compliant").default(true),
  dataRetentionDays: integer("data_retention_days").default(365),
});

export const professionals = pgTable("professionals", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }).notNull().unique(),
  phone: varchar("phone", { length: 20 }),
  specialtyId: uuid("specialty_id").references(() => specialties.id),
  clientId: uuid("client_id").references(() => clients.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const specialties = pgTable("specialties", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  description: text("description"),
  color: varchar("color", { length: 7 }).default("#3B82F6"),
  serviceId: uuid("service_id"),
  clientId: uuid("client_id").references(() => clients.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const services = pgTable("services", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  category: varchar("category", { length: 100 }),
  description: text("description"),
  duration: integer("duration").notNull(), // em minutos
  price: integer("price"), // em centavos
  specialtyId: uuid("specialty_id").references(() => specialties.id),
  clientId: uuid("client_id").references(() => clients.id),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

export const appointments = pgTable("appointments", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  clientId: uuid("client_id").references(() => clients.id),
  professionalId: uuid("professional_id").references(() => professionals.id),
  serviceId: uuid("service_id").references(() => services.id),
  scheduledAt: timestamp("scheduled_at").notNull(),
  startTime: varchar("start_time", { length: 8 }),
  endTime: varchar("end_time", { length: 8 }),
  duration: integer("duration").notNull(), // em minutos
  status: varchar("status", { length: 50 }).default("scheduled"), // scheduled, confirmed, completed, cancelled
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const customers = pgTable("customers", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 255 }),
  phone: varchar("phone", { length: 20 }),
  cpfCnpj: varchar("cpf_cnpj", { length: 20 }),
  notes: text("notes"),
  clientId: uuid("client_id").references(() => clients.id),
  createdAt: timestamp("created_at").defaultNow(),
});

export const connections = pgTable("connections", {
  id: serial("id").primaryKey(),
  instance: varchar("instance", { length: 255 }).notNull(),
  token: text("token").notNull(),
  host: varchar("host", { length: 255 }).notNull(),
  clientId: uuid("client_id").references(() => clients.id),
  isActive: boolean("is_active").default(true),
  lastSync: timestamp("last_sync"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const professionalAvailability = pgTable("professional_availability", {
  id: uuid("id").primaryKey().default(sql`gen_random_uuid()`),
  professionalId: uuid("professional_id").notNull().references(() => professionals.id),
  date: varchar("date", { length: 10 }).notNull(), // YYYY-MM-DD format
  startTime: time("start_time").notNull(), // HH:mm:ss format
  endTime: time("end_time").notNull(), // HH:mm:ss format
  isActive: boolean("is_active").default(true),
  serviceId: uuid("service_id").references(() => services.id), // opcional: horário específico para um serviço
  customPrice: integer("custom_price"), // preço personalizado em centavos
  customDuration: integer("custom_duration"), // duração personalizada em minutos
  dayOfWeek: integer("day_of_week"), // 0-6 (0=domingo, 1=segunda, etc.)
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  name: true,
  email: true,
  password: true,
  role: true,
});

export const registerSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(1, "Senha é obrigatória"),
  rememberMe: z.boolean().optional(),
});

// Client schemas
export const insertClientSchema = createInsertSchema(clients).pick({
  name: true,
  email: true,
  phone: true,
  serviceType: true,
  whatsappInstanceUrl: true,
  settings: true,
  assistantId: true,
  password: true,
  isActive: true,
  plan: true,
  maxUsers: true,
  maxAppointments: true,
  maxStorage: true,
  customDomain: true,
  brandingSettings: true,
  businessHours: true,
  timezone: true,
  language: true,
  currency: true,
  twoFactorEnabled: true,
  sessionTimeout: true,
  emailNotifications: true,
  smsNotifications: true,
  whatsappNotifications: true,
  autoBackup: true,
  backupFrequency: true,
  integrations: true,
  gdprCompliant: true,
  dataRetentionDays: true,
});

export const clientRegisterSchema = z.object({
  name: z.string().min(2, "Nome deve ter pelo menos 2 caracteres"),
  email: z.string().email("E-mail inválido"),
  phone: z.string().optional(),
  password: z.string().min(6, "Senha deve ter pelo menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirmação de senha é obrigatória"),
  serviceType: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Senhas não coincidem",
  path: ["confirmPassword"],
});

// Additional schemas for new tables
export const insertProfessionalSchema = createInsertSchema(professionals).pick({
  name: true,
  email: true,
  phone: true,
  specialtyId: true,
  clientId: true,
  isActive: true,
});

export const insertSpecialtySchema = createInsertSchema(specialties).pick({
  name: true,
  description: true,
  color: true,
  serviceId: true,
  isActive: true,
});

export const insertServiceSchema = createInsertSchema(services).pick({
  name: true,
  category: true,
  description: true,
  duration: true,
  price: true,
  specialtyId: true,
  clientId: true,
  isActive: true,
});

export const insertAppointmentSchema = createInsertSchema(appointments).pick({
  clientId: true,
  professionalId: true,
  serviceId: true,
  scheduledAt: true,
  startTime: true,
  endTime: true,
  duration: true,
  status: true,
  notes: true,
});

export const updateAppointmentSchema = z.object({
  scheduledAt: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  serviceId: z.string().optional(),
  professionalId: z.string().optional(),
  status: z.string().optional(),
});

export const insertCustomerSchema = createInsertSchema(customers).pick({
  name: true,
  email: true,
  phone: true,
  cpfCnpj: true,
  notes: true,
  clientId: true,
});

export const insertProfessionalAvailabilitySchema = createInsertSchema(professionalAvailability).pick({
  professionalId: true,
  date: true,
  startTime: true,
  endTime: true,
  isActive: true,
  serviceId: true,
  customPrice: true,
  customDuration: true,
  dayOfWeek: true,
});

export const professionalConfigSchema = z.object({
  professionalId: z.string().uuid(),
  dayOfWeek: z.number().min(0).max(6), // 0=domingo, 6=sábado
  startTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  endTime: z.string().regex(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/),
  serviceConfigs: z.array(z.object({
    serviceId: z.string().uuid(),
    customPrice: z.number().min(0).optional(),
    customDuration: z.number().min(1).optional(),
  })).optional(),
});

export const insertConnectionSchema = createInsertSchema(connections).pick({
  instance: true,
  token: true,
  host: true,
  clientId: true,
  isActive: true,
});

// Export types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type RegisterRequest = z.infer<typeof registerSchema>;
export type LoginRequest = z.infer<typeof loginSchema>;
export type Session = typeof sessions.$inferSelect;
export type Client = typeof clients.$inferSelect;
export type SystemSetting = typeof systemSettings.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type SubscriptionPlan = typeof subscriptionPlans.$inferSelect;
export type Subscription = typeof subscriptions.$inferSelect;
export type Invoice = typeof invoices.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type InsertClient = z.infer<typeof insertClientSchema>;
export type ClientRegisterRequest = z.infer<typeof clientRegisterSchema>;

export type Professional = typeof professionals.$inferSelect;
export type InsertProfessional = z.infer<typeof insertProfessionalSchema>;
export type Specialty = typeof specialties.$inferSelect;
export type InsertSpecialty = z.infer<typeof insertSpecialtySchema>;
export type Service = typeof services.$inferSelect;
export type InsertService = z.infer<typeof insertServiceSchema>;
export type Appointment = typeof appointments.$inferSelect;
export type InsertAppointment = z.infer<typeof insertAppointmentSchema>;
export type UpdateAppointment = z.infer<typeof updateAppointmentSchema>;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;
export type Connection = typeof connections.$inferSelect;
export type InsertConnection = z.infer<typeof insertConnectionSchema>;
export type ProfessionalAvailability = typeof professionalAvailability.$inferSelect;
export type InsertProfessionalAvailability = z.infer<typeof insertProfessionalAvailabilitySchema>;
export type ProfessionalConfigRequest = z.infer<typeof professionalConfigSchema>;
