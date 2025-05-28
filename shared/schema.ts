import { pgTable, text, serial, integer, decimal, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

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
