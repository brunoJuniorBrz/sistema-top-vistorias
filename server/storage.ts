import { 
  User,
  InsertUser,
  Fechamento,
  InsertFechamento,
  Receivable,
  InsertReceivable,
  Product, 
  InsertProduct, 
  Transaction, 
  InsertTransaction,
  TransactionItem,
  InsertTransactionItem,
  RegisterSession,
  InsertRegisterSession,
  CartItem,
  DailyStats,
  ClosingCalculatedTotals,
  Usuario,
  InsertUsuario,
  Entrada,
  InsertEntrada,
  EntradaEletronica,
  InsertEntradaEletronica,
  Saida,
  InsertSaida,
  AReceber,
  InsertAReceber
} from "@shared/schema";

export interface IStorage {
  // Métodos para as novas tabelas especificadas
  getUsuarios(): Promise<Usuario[]>;
  getUsuarioById(id: number): Promise<Usuario | undefined>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  createUsuario(usuario: InsertUsuario): Promise<Usuario>;
  updateUsuario(id: number, usuario: Partial<InsertUsuario>): Promise<Usuario | undefined>;
  deleteUsuario(id: number): Promise<boolean>;
  
  getEntradas(usuarioId?: number, data?: string): Promise<Entrada[]>;
  getEntradaById(id: number): Promise<Entrada | undefined>;
  createEntrada(entrada: InsertEntrada): Promise<Entrada>;
  updateEntrada(id: number, entrada: Partial<InsertEntrada>): Promise<Entrada | undefined>;
  deleteEntrada(id: number): Promise<boolean>;
  
  getEntradasEletronicas(usuarioId?: number, data?: string): Promise<EntradaEletronica[]>;
  getEntradaEletronicaById(id: number): Promise<EntradaEletronica | undefined>;
  createEntradaEletronica(entrada: InsertEntradaEletronica): Promise<EntradaEletronica>;
  updateEntradaEletronica(id: number, entrada: Partial<InsertEntradaEletronica>): Promise<EntradaEletronica | undefined>;
  deleteEntradaEletronica(id: number): Promise<boolean>;
  
  getSaidas(usuarioId?: number, data?: string): Promise<Saida[]>;
  getSaidaById(id: number): Promise<Saida | undefined>;
  createSaida(saida: InsertSaida): Promise<Saida>;
  updateSaida(id: number, saida: Partial<InsertSaida>): Promise<Saida | undefined>;
  deleteSaida(id: number): Promise<boolean>;
  
  getAReceber(usuarioId?: number, data?: string): Promise<AReceber[]>;
  getAReceberById(id: number): Promise<AReceber | undefined>;
  createAReceber(aReceber: InsertAReceber): Promise<AReceber>;
  updateAReceber(id: number, aReceber: Partial<InsertAReceber>): Promise<AReceber | undefined>;
  deleteAReceber(id: number): Promise<boolean>;

  // Métodos legacy mantidos para compatibilidade
  getUsers(): Promise<User[]>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  getFechamentos(userId?: string, lojaId?: string, date?: string): Promise<Fechamento[]>;
  getFechamentoById(id: number): Promise<Fechamento | undefined>;
  createFechamento(fechamento: InsertFechamento): Promise<Fechamento>;
  updateFechamento(id: number, fechamento: Partial<InsertFechamento>): Promise<Fechamento | undefined>;
  deleteFechamento(id: number): Promise<boolean>;
  
  getReceivables(fechamentoId?: number, userId?: string, status?: string): Promise<Receivable[]>;
  createReceivable(receivable: InsertReceivable): Promise<Receivable>;
  updateReceivableStatus(id: number, status: string, dataPagamento?: Date, dataBaixa?: Date): Promise<Receivable | undefined>;
  
  authenticateUser(email: string, password: string): Promise<User | null>;
  getLojaIdFromEmail(email: string): string | null;

  getProducts(): Promise<Product[]>;
  getProductByCode(code: string): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: number): Promise<boolean>;
  updateProductStock(code: string, quantity: number): Promise<boolean>;

  getTransactions(): Promise<(Transaction & { items: TransactionItem[] })[]>;
  getTransactionById(id: string): Promise<(Transaction & { items: TransactionItem[] }) | undefined>;
  createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction>;

  getCurrentRegisterSession(): Promise<RegisterSession | undefined>;
  createRegisterSession(session: InsertRegisterSession): Promise<RegisterSession>;
  updateRegisterSession(id: number, session: Partial<InsertRegisterSession>): Promise<RegisterSession | undefined>;
  
  getDailyStats(date?: string): Promise<DailyStats>;
}

export class MemStorage implements IStorage {
  private usuarios = new Map<number, Usuario>();
  private entradas = new Map<number, Entrada>();
  private entradasEletronicas = new Map<number, EntradaEletronica>();
  private saidas = new Map<number, Saida>();
  private aReceber = new Map<number, AReceber>();
  
  private users = new Map<number, User>();
  private fechamentos = new Map<number, Fechamento>();
  private receivables = new Map<number, Receivable>();
  private products = new Map<number, Product>();
  private transactions = new Map<string, Transaction>();
  private transactionItems = new Map<string, TransactionItem[]>();
  private registerSessions = new Map<number, RegisterSession>();
  
  private currentUsuarioId = 1;
  private currentEntradaId = 1;
  private currentEntradaEletronicaId = 1;
  private currentSaidaId = 1;
  private currentAReceberId = 1;
  private currentUserId = 1;
  private currentFechamentoId = 1;
  private currentReceivableId = 1;
  private currentProductId = 1;
  private currentTransactionId = 1;
  private currentSessionId = 1;

  constructor() {
    this.initializeData();
  }

  private initializeData() {
    const currentDate = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().split(' ')[0];

    // Inicializar usuarios
    this.usuarios.set(1, {
      id: 1,
      nome: 'Administrador Sistema',
      email: 'admin@sistema.com',
      senha: 'admin123',
      tipoUsuario: 'admin'
    });

    this.usuarios.set(2, {
      id: 2,
      nome: 'João Funcionário',
      email: 'joao@sistema.com',
      senha: 'func123',
      tipoUsuario: 'funcionario'
    });
    this.currentUsuarioId = 3;

    // Inicializar entradas
    this.entradas.set(1, {
      id: 1,
      valor: "100.50",
      descricao: "Venda de produto",
      data: currentDate,
      hora: "10:30:00",
      usuarioId: 1
    });
    this.currentEntradaId = 2;

    // Inicializar entradas eletrônicas
    this.entradasEletronicas.set(1, {
      id: 1,
      valor: "250.00",
      formaPagamento: "PIX",
      descricao: "Pagamento eletrônico",
      data: currentDate,
      hora: "14:15:00",
      usuarioId: 1
    });
    this.currentEntradaEletronicaId = 2;

    // Inicializar saídas
    this.saidas.set(1, {
      id: 1,
      valor: "50.00",
      descricao: "Combustível",
      data: currentDate,
      hora: "09:00:00",
      usuarioId: 1
    });
    this.currentSaidaId = 2;

    // Inicializar a receber
    this.aReceber.set(1, {
      id: 1,
      valor: "300.00",
      cliente: "Cliente XYZ",
      descricao: "Serviço prestado",
      data: currentDate,
      hora: "16:45:00",
      usuarioId: 1
    });
    this.currentAReceberId = 2;

    // Inicializar dados legacy
    this.users.set(1, {
      id: 1,
      uid: 'admin_123',
      email: 'admin@topvistorias.com',
      name: 'Administrador',
      lojaId: 'admin',
      role: 'admin',
      createdAt: new Date()
    });
    this.currentUserId = 2;

    this.products.set(1, {
      id: 1,
      code: 'SKU001',
      name: 'Produto Teste',
      price: '99.90',
      stock: 10,
      category: 'Geral'
    });
    this.currentProductId = 2;
  }

  // IMPLEMENTAÇÃO DOS MÉTODOS PARA AS NOVAS TABELAS

  async getUsuarios(): Promise<Usuario[]> {
    return Array.from(this.usuarios.values());
  }

  async getUsuarioById(id: number): Promise<Usuario | undefined> {
    return this.usuarios.get(id);
  }

  async getUsuarioByEmail(email: string): Promise<Usuario | undefined> {
    return Array.from(this.usuarios.values()).find(u => u.email === email);
  }

  async createUsuario(insertUsuario: InsertUsuario): Promise<Usuario> {
    const id = this.currentUsuarioId++;
    const usuario: Usuario = { ...insertUsuario, id };
    this.usuarios.set(id, usuario);
    return usuario;
  }

  async updateUsuario(id: number, updateData: Partial<InsertUsuario>): Promise<Usuario | undefined> {
    const usuario = this.usuarios.get(id);
    if (!usuario) return undefined;
    const updatedUsuario = { ...usuario, ...updateData };
    this.usuarios.set(id, updatedUsuario);
    return updatedUsuario;
  }

  async deleteUsuario(id: number): Promise<boolean> {
    return this.usuarios.delete(id);
  }

  async getEntradas(usuarioId?: number, data?: string): Promise<Entrada[]> {
    let entradas = Array.from(this.entradas.values());
    if (usuarioId) entradas = entradas.filter(e => e.usuarioId === usuarioId);
    if (data) entradas = entradas.filter(e => e.data === data);
    return entradas.sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime());
  }

  async getEntradaById(id: number): Promise<Entrada | undefined> {
    return this.entradas.get(id);
  }

  async createEntrada(insertEntrada: InsertEntrada): Promise<Entrada> {
    const id = this.currentEntradaId++;
    const entrada: Entrada = { ...insertEntrada, id };
    this.entradas.set(id, entrada);
    return entrada;
  }

  async updateEntrada(id: number, updateData: Partial<InsertEntrada>): Promise<Entrada | undefined> {
    const entrada = this.entradas.get(id);
    if (!entrada) return undefined;
    const updatedEntrada = { ...entrada, ...updateData };
    this.entradas.set(id, updatedEntrada);
    return updatedEntrada;
  }

  async deleteEntrada(id: number): Promise<boolean> {
    return this.entradas.delete(id);
  }

  async getEntradasEletronicas(usuarioId?: number, data?: string): Promise<EntradaEletronica[]> {
    let entradas = Array.from(this.entradasEletronicas.values());
    if (usuarioId) entradas = entradas.filter(e => e.usuarioId === usuarioId);
    if (data) entradas = entradas.filter(e => e.data === data);
    return entradas.sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime());
  }

  async getEntradaEletronicaById(id: number): Promise<EntradaEletronica | undefined> {
    return this.entradasEletronicas.get(id);
  }

  async createEntradaEletronica(insertEntrada: InsertEntradaEletronica): Promise<EntradaEletronica> {
    const id = this.currentEntradaEletronicaId++;
    const entrada: EntradaEletronica = { ...insertEntrada, id };
    this.entradasEletronicas.set(id, entrada);
    return entrada;
  }

  async updateEntradaEletronica(id: number, updateData: Partial<InsertEntradaEletronica>): Promise<EntradaEletronica | undefined> {
    const entrada = this.entradasEletronicas.get(id);
    if (!entrada) return undefined;
    const updatedEntrada = { ...entrada, ...updateData };
    this.entradasEletronicas.set(id, updatedEntrada);
    return updatedEntrada;
  }

  async deleteEntradaEletronica(id: number): Promise<boolean> {
    return this.entradasEletronicas.delete(id);
  }

  async getSaidas(usuarioId?: number, data?: string): Promise<Saida[]> {
    let saidas = Array.from(this.saidas.values());
    if (usuarioId) saidas = saidas.filter(s => s.usuarioId === usuarioId);
    if (data) saidas = saidas.filter(s => s.data === data);
    return saidas.sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime());
  }

  async getSaidaById(id: number): Promise<Saida | undefined> {
    return this.saidas.get(id);
  }

  async createSaida(insertSaida: InsertSaida): Promise<Saida> {
    const id = this.currentSaidaId++;
    const saida: Saida = { ...insertSaida, id };
    this.saidas.set(id, saida);
    return saida;
  }

  async updateSaida(id: number, updateData: Partial<InsertSaida>): Promise<Saida | undefined> {
    const saida = this.saidas.get(id);
    if (!saida) return undefined;
    const updatedSaida = { ...saida, ...updateData };
    this.saidas.set(id, updatedSaida);
    return updatedSaida;
  }

  async deleteSaida(id: number): Promise<boolean> {
    return this.saidas.delete(id);
  }

  async getAReceber(usuarioId?: number, data?: string): Promise<AReceber[]> {
    let aReceber = Array.from(this.aReceber.values());
    if (usuarioId) aReceber = aReceber.filter(a => a.usuarioId === usuarioId);
    if (data) aReceber = aReceber.filter(a => a.data === data);
    return aReceber.sort((a, b) => new Date(b.data + ' ' + b.hora).getTime() - new Date(a.data + ' ' + a.hora).getTime());
  }

  async getAReceberById(id: number): Promise<AReceber | undefined> {
    return this.aReceber.get(id);
  }

  async createAReceber(insertAReceber: InsertAReceber): Promise<AReceber> {
    const id = this.currentAReceberId++;
    const aReceber: AReceber = { ...insertAReceber, id };
    this.aReceber.set(id, aReceber);
    return aReceber;
  }

  async updateAReceber(id: number, updateData: Partial<InsertAReceber>): Promise<AReceber | undefined> {
    const aReceber = this.aReceber.get(id);
    if (!aReceber) return undefined;
    const updatedAReceber = { ...aReceber, ...updateData };
    this.aReceber.set(id, updatedAReceber);
    return updatedAReceber;
  }

  async deleteAReceber(id: number): Promise<boolean> {
    return this.aReceber.delete(id);
  }

  // MÉTODOS LEGACY PARA COMPATIBILIDADE

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getUserByUid(uid: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.uid === uid);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updateData: Partial<InsertUser>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    const updatedUser = { ...user, ...updateData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getFechamentos(): Promise<Fechamento[]> {
    return Array.from(this.fechamentos.values());
  }

  async getFechamentoById(id: number): Promise<Fechamento | undefined> {
    return this.fechamentos.get(id);
  }

  async createFechamento(insertFechamento: InsertFechamento): Promise<Fechamento> {
    const id = this.currentFechamentoId++;
    const fechamento: Fechamento = { 
      ...insertFechamento, 
      id, 
      createdAt: new Date(), 
      updatedAt: new Date() 
    };
    this.fechamentos.set(id, fechamento);
    return fechamento;
  }

  async updateFechamento(id: number, updateData: Partial<InsertFechamento>): Promise<Fechamento | undefined> {
    const fechamento = this.fechamentos.get(id);
    if (!fechamento) return undefined;
    const updatedFechamento = { ...fechamento, ...updateData, updatedAt: new Date() };
    this.fechamentos.set(id, updatedFechamento);
    return updatedFechamento;
  }

  async deleteFechamento(id: number): Promise<boolean> {
    return this.fechamentos.delete(id);
  }

  async getReceivables(): Promise<Receivable[]> {
    return Array.from(this.receivables.values());
  }

  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> {
    const id = this.currentReceivableId++;
    const receivable: Receivable = { 
      ...insertReceivable, 
      id, 
      createdAt: new Date() 
    };
    this.receivables.set(id, receivable);
    return receivable;
  }

  async updateReceivableStatus(id: number, status: string, dataPagamento?: Date, dataBaixa?: Date): Promise<Receivable | undefined> {
    const receivable = this.receivables.get(id);
    if (!receivable) return undefined;
    const updatedReceivable = { 
      ...receivable, 
      status, 
      dataPagamento: dataPagamento || null, 
      dataBaixa: dataBaixa || null 
    };
    this.receivables.set(id, updatedReceivable);
    return updatedReceivable;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.getUserByEmail(email);
    return user || null;
  }

  getLojaIdFromEmail(email: string): string | null {
    if (email.includes('admin')) return 'admin';
    return 'loja_001';
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
    product.stock = Math.max(0, product.stock + quantity);
    this.products.set(product.id, product);
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
    const transactionId = `TXN${this.currentTransactionId++}`;
    const transaction: Transaction = {
      ...insertTransaction,
      id: this.currentTransactionId,
      transactionId,
      datetime: new Date(),
      status: 'completed',
      operatorName: 'Sistema'
    };

    this.transactions.set(transactionId, transaction);
    
    const transactionItems: TransactionItem[] = items.map((item, index) => ({
      ...item,
      id: index + 1
    }));
    
    this.transactionItems.set(transactionId, transactionItems);
    return transaction;
  }

  async getCurrentRegisterSession(): Promise<RegisterSession | undefined> {
    return Array.from(this.registerSessions.values()).find(s => s.isOpen);
  }

  async createRegisterSession(insertSession: InsertRegisterSession): Promise<RegisterSession> {
    const id = this.currentSessionId++;
    const session: RegisterSession = { 
      ...insertSession, 
      id,
      operatorName: 'Sistema',
      isOpen: true,
      currentBalance: '0',
      expectedBalance: '0',
      physicalBalance: null,
      reconciled: false
    };
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
    const transactions = await this.getTransactions();
    const filteredTransactions = date 
      ? transactions.filter(t => t.datetime.toISOString().split('T')[0] === date)
      : transactions;

    const totalSales = filteredTransactions.reduce((sum, t) => sum + parseFloat(t.total), 0);
    const transactionCount = filteredTransactions.length;
    const averageTicket = transactionCount > 0 ? totalSales / transactionCount : 0;

    return {
      totalSales,
      transactionCount,
      averageTicket,
      cashSales: totalSales * 0.3,
      cardSales: totalSales * 0.4,
      pixSales: totalSales * 0.3
    };
  }
}

export const storage = new MemStorage();