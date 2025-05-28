import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Users table
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  uid: text("uid").notNull().unique(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  lojaId: text("loja_id").notNull(),
  role: text("role").notNull().default("user"), // user, admin
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Fechamentos (Cash Closings) table
export const fechamentos = pgTable("fechamentos", {
  id: serial("id").primaryKey(),
  dataFechamento: text("data_fechamento").notNull(), // YYYY-MM-DD format
  lojaId: text("loja_id").notNull(),
  userId: text("user_id").notNull(),
  operatorName: text("operator_name").notNull(),
  
  // Entradas (Entrances)
  carros: decimal("carros", { precision: 10, scale: 2 }).notNull().default("0"),
  carrosQuantidade: integer("carros_quantidade").notNull().default(0),
  motos: decimal("motos", { precision: 10, scale: 2 }).notNull().default("0"),
  motosQuantidade: integer("motos_quantidade").notNull().default(0),
  caminhoes: decimal("caminhoes", { precision: 10, scale: 2 }).notNull().default("0"),
  caminhoesQuantidade: integer("caminhoes_quantidade").notNull().default(0),
  
  // Saídas Fixas (Fixed Exits)
  aluguel: decimal("aluguel", { precision: 10, scale: 2 }).notNull().default("0"),
  energia: decimal("energia", { precision: 10, scale: 2 }).notNull().default("0"),
  funcionario: decimal("funcionario", { precision: 10, scale: 2 }).notNull().default("0"),
  despachante: decimal("despachante", { precision: 10, scale: 2 }).notNull().default("0"),
  
  // Saídas Variáveis (Variable Exits)
  saidasVariaveis: text("saidas_variaveis").notNull().default("[]"), // JSON string
  
  // Pagamentos Recebidos (Received Payments)
  pagamentosRecebidos: text("pagamentos_recebidos").notNull().default("[]"), // JSON string
  
  // A Receber (Receivables)
  aReceber: text("a_receber").notNull().default("[]"), // JSON string
  
  // Calculated totals
  totalEntradas: decimal("total_entradas", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSaidasFixas: decimal("total_saidas_fixas", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSaidasVariaveis: decimal("total_saidas_variaveis", { precision: 10, scale: 2 }).notNull().default("0"),
  totalSaidas: decimal("total_saidas", { precision: 10, scale: 2 }).notNull().default("0"),
  totalPagamentosRecebidos: decimal("total_pagamentos_recebidos", { precision: 10, scale: 2 }).notNull().default("0"),
  totalAReceber: decimal("total_a_receber", { precision: 10, scale: 2 }).notNull().default("0"),
  saldoFinal: decimal("saldo_final", { precision: 10, scale: 2 }).notNull().default("0"),
  
  createdAt: timestamp("created_at").notNull().defaultNow(),
  updatedAt: timestamp("updated_at").notNull().defaultNow(),
});

// Receivables table (for tracking a receber items)
export const receivables = pgTable("receivables", {
  id: serial("id").primaryKey(),
  fechamentoId: integer("fechamento_id").notNull(),
  nomeCliente: text("nome_cliente").notNull(),
  placa: text("placa").notNull(),
  valorReceber: decimal("valor_receber", { precision: 10, scale: 2 }).notNull(),
  dataDebito: text("data_debito").notNull(), // YYYY-MM-DD
  lojaId: text("loja_id").notNull(),
  userId: text("user_id").notNull(),
  status: text("status").notNull().default("pendente"), // pendente, pago, baixado
  dataPagamento: timestamp("data_pagamento"),
  dataBaixa: timestamp("data_baixa"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

// Keep legacy tables for reference but focus on the new structure
export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  code: text("code").notNull().unique(),
  name: text("name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  category: text("category").notNull(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull().unique(),
  datetime: timestamp("datetime").notNull().defaultNow(),
  total: decimal("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  status: text("status").notNull().default("completed"),
  operatorName: text("operator_name").notNull().default("Sistema"),
});

export const transactionItems = pgTable("transaction_items", {
  id: serial("id").primaryKey(),
  transactionId: text("transaction_id").notNull(),
  productCode: text("product_code").notNull(),
  productName: text("product_name").notNull(),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  quantity: integer("quantity").notNull(),
});

export const registerSessions = pgTable("register_sessions", {
  id: serial("id").primaryKey(),
  date: text("date").notNull(),
  isOpen: boolean("is_open").notNull().default(false),
  openingBalance: decimal("opening_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  currentBalance: decimal("current_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  expectedBalance: decimal("expected_balance", { precision: 10, scale: 2 }).notNull().default("0"),
  physicalBalance: decimal("physical_balance", { precision: 10, scale: 2 }),
  reconciled: boolean("reconciled").notNull().default(false),
  operatorName: text("operator_name").notNull().default("Sistema"),
});

export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  datetime: true,
});

export const insertTransactionItemSchema = createInsertSchema(transactionItems).omit({
  id: true,
});

export const insertRegisterSessionSchema = createInsertSchema(registerSessions).omit({
  id: true,
});

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;

export type TransactionItem = typeof transactionItems.$inferSelect;
export type InsertTransactionItem = z.infer<typeof insertTransactionItemSchema>;

export type RegisterSession = typeof registerSessions.$inferSelect;
export type InsertRegisterSession = z.infer<typeof insertRegisterSessionSchema>;

// Additional types for cart and sales
export type CartItem = {
  code: string;
  name: string;
  price: number;
  quantity: number;
};

export type SaleRequest = {
  items: CartItem[];
  paymentMethod: string;
  receivedAmount?: number;
};

export type DailyStats = {
  totalSales: number;
  transactionCount: number;
  averageTicket: number;
  cashSales: number;
  cardSales: number;
  pixSales: number;
};
