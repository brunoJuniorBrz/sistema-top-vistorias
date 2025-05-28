import { 
  Product, 
  InsertProduct, 
  Transaction, 
  InsertTransaction,
  TransactionItem,
  InsertTransactionItem,
  RegisterSession,
  InsertRegisterSession,
  CartItem,
  DailyStats
} from "@shared/schema";

export interface IStorage {
  // Products
  getProducts(): Promise<Product[]>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductStock(code: string, quantity: number): Promise<boolean>;

  // Transactions
  getTransactions(): Promise<(Transaction & { items: TransactionItem[] })[]>;
  getTransactionById(id: string): Promise<(Transaction & { items: TransactionItem[] }) | undefined>;
  createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction>;

  // Register Sessions
  getCurrentRegisterSession(): Promise<RegisterSession | undefined>;
  createRegisterSession(session: InsertRegisterSession): Promise<RegisterSession>;
  updateRegisterSession(id: number, session: Partial<InsertRegisterSession>): Promise<RegisterSession | undefined>;
  
  // Stats
  getDailyStats(date?: string): Promise<DailyStats>;
}

export class MemStorage implements IStorage {
  private products: Map<number, Product>;
  private transactions: Map<string, Transaction>;
  private transactionItems: Map<string, TransactionItem[]>;
  private registerSessions: Map<number, RegisterSession>;
  private currentProductId: number;
  private currentTransactionId: number;
  private currentSessionId: number;

  constructor() {
    this.products = new Map();
    this.transactions = new Map();
    this.transactionItems = new Map();
    this.registerSessions = new Map();
    this.currentProductId = 1;
    this.currentTransactionId = 1;
    this.currentSessionId = 1;

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Sample products
    const sampleProducts: Product[] = [
      { id: 1, code: 'SKU001', name: 'Smartphone XYZ', price: '899.90', stock: 25, category: 'Eletrônicos' },
      { id: 2, code: 'SKU002', name: 'Fone Bluetooth', price: '149.90', stock: 50, category: 'Eletrônicos' },
      { id: 3, code: 'SKU003', name: 'Camiseta Básica', price: '39.90', stock: 100, category: 'Roupas' },
      { id: 4, code: 'SKU004', name: 'Jeans Premium', price: '89.90', stock: 30, category: 'Roupas' },
      { id: 5, code: 'SKU005', name: 'Café Gourmet 500g', price: '24.90', stock: 75, category: 'Alimentação' }
    ];

    sampleProducts.forEach(product => {
      this.products.set(product.id, product);
      this.currentProductId = Math.max(this.currentProductId, product.id + 1);
    });

    // Initialize register session
    const today = new Date().toISOString().split('T')[0];
    const session: RegisterSession = {
      id: 1,
      date: today,
      isOpen: true,
      openingBalance: '200.00',
      currentBalance: '847.30',
      expectedBalance: '847.30',
      physicalBalance: null,
      reconciled: false,
      operatorName: 'João Silva'
    };
    this.registerSessions.set(1, session);
  }

  async getProducts(): Promise<Product[]> {
    return Array.from(this.products.values());
  }

  async getProductByCode(code: string): Promise<Product | undefined> {
    return Array.from(this.products.values()).find(p => p.code === code);
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const id = this.currentProductId++;
    const product: Product = { ...insertProduct, id };
    this.products.set(id, product);
    return product;
  }

  async updateProduct(id: number, updateData: Partial<InsertProduct>): Promise<Product | undefined> {
    const product = this.products.get(id);
    if (!product) return undefined;

    const updatedProduct = { ...product, ...updateData };
    this.products.set(id, updatedProduct);
    return updatedProduct;
  }

  async deleteProduct(id: number): Promise<boolean> {
    return this.products.delete(id);
  }

  async updateProductStock(code: string, quantity: number): Promise<boolean> {
    const product = await this.getProductByCode(code);
    if (!product) return false;

    const updatedProduct = { ...product, stock: product.stock - quantity };
    this.products.set(product.id, updatedProduct);
    return true;
  }

  async getTransactions(): Promise<(Transaction & { items: TransactionItem[] })[]> {
    const transactions = Array.from(this.transactions.values());
    return transactions.map(transaction => ({
      ...transaction,
      items: this.transactionItems.get(transaction.transactionId) || []
    }));
  }

  async getTransactionById(id: string): Promise<(Transaction & { items: TransactionItem[] }) | undefined> {
    const transaction = this.transactions.get(id);
    if (!transaction) return undefined;

    return {
      ...transaction,
      items: this.transactionItems.get(id) || []
    };
  }

  async createTransaction(insertTransaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction> {
    const transaction: Transaction = {
      ...insertTransaction,
      id: this.currentTransactionId++,
      datetime: new Date()
    };

    this.transactions.set(transaction.transactionId, transaction);
    this.transactionItems.set(transaction.transactionId, items.map((item, index) => ({
      ...item,
      id: index + 1
    })));

    // Update register balance if cash payment
    if (insertTransaction.paymentMethod === 'cash') {
      const currentSession = await this.getCurrentRegisterSession();
      if (currentSession) {
        const newBalance = (parseFloat(currentSession.currentBalance) + parseFloat(insertTransaction.total)).toFixed(2);
        await this.updateRegisterSession(currentSession.id, { 
          currentBalance: newBalance,
          expectedBalance: newBalance
        });
      }
    }

    return transaction;
  }

  async getCurrentRegisterSession(): Promise<RegisterSession | undefined> {
    const today = new Date().toISOString().split('T')[0];
    return Array.from(this.registerSessions.values()).find(session => session.date === today);
  }

  async createRegisterSession(insertSession: InsertRegisterSession): Promise<RegisterSession> {
    const id = this.currentSessionId++;
    const session: RegisterSession = { ...insertSession, id };
    this.registerSessions.set(id, session);
    return session;
  }

  async updateRegisterSession(id: number, updateData: Partial<InsertRegisterSession>): Promise<RegisterSession | undefined> {
    const session = this.registerSessions.get(id);
    if (!session) return undefined;

    const updatedSession = { ...session, ...updateData };
    this.registerSessions.set(id, updatedSession);
    return updatedSession;
  }

  async getDailyStats(date?: string): Promise<DailyStats> {
    const targetDate = date || new Date().toISOString().split('T')[0];
    const transactions = Array.from(this.transactions.values())
      .filter(t => t.datetime.toISOString().split('T')[0] === targetDate);

    const totalSales = transactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
    const transactionCount = transactions.length;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

    const cashSales = transactions
      .filter(t => t.paymentMethod === 'cash')
      .reduce((sum, t) => sum + parseFloat(t.total), 0);

    const cardSales = transactions
      .filter(t => t.paymentMethod === 'card')
      .reduce((sum, t) => sum + parseFloat(t.total), 0);

    const pixSales = transactions
      .filter(t => t.paymentMethod === 'pix')
      .reduce((sum, t) => sum + parseFloat(t.total), 0);

    return {
      totalSales,
      transactionCount,
      averageTicket,
      cashSales,
      cardSales,
      pixSales
    };
  }
}

export const storage = new MemStorage();
