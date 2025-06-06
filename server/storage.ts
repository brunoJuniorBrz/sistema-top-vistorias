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
  // Novos tipos
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
  // Novos métodos para as tabelas especificadas
  // Usuarios
  getUsuarios(): Promise<Usuario[]>;
  getUsuarioById(id: number): Promise<Usuario | undefined>;
  getUsuarioByEmail(email: string): Promise<Usuario | undefined>;
  createUsuario(usuario: InsertUsuario): Promise<Usuario>;
  updateUsuario(id: number, usuario: Partial<InsertUsuario>): Promise<Usuario | undefined>;
  deleteUsuario(id: number): Promise<boolean>;
  
  // Entradas
  getEntradas(usuarioId?: number, data?: string): Promise<Entrada[]>;
  getEntradaById(id: number): Promise<Entrada | undefined>;
  createEntrada(entrada: InsertEntrada): Promise<Entrada>;
  updateEntrada(id: number, entrada: Partial<InsertEntrada>): Promise<Entrada | undefined>;
  deleteEntrada(id: number): Promise<boolean>;
  
  // Entradas Eletrônicas
  getEntradasEletronicas(usuarioId?: number, data?: string): Promise<EntradaEletronica[]>;
  getEntradaEletronicaById(id: number): Promise<EntradaEletronica | undefined>;
  createEntradaEletronica(entrada: InsertEntradaEletronica): Promise<EntradaEletronica>;
  updateEntradaEletronica(id: number, entrada: Partial<InsertEntradaEletronica>): Promise<EntradaEletronica | undefined>;
  deleteEntradaEletronica(id: number): Promise<boolean>;
  
  // Saídas
  getSaidas(usuarioId?: number, data?: string): Promise<Saida[]>;
  getSaidaById(id: number): Promise<Saida | undefined>;
  createSaida(saida: InsertSaida): Promise<Saida>;
  updateSaida(id: number, saida: Partial<InsertSaida>): Promise<Saida | undefined>;
  deleteSaida(id: number): Promise<boolean>;
  
  // A Receber
  getAReceber(usuarioId?: number, data?: string): Promise<AReceber[]>;
  getAReceberById(id: number): Promise<AReceber | undefined>;
  createAReceber(aReceber: InsertAReceber): Promise<AReceber>;
  updateAReceber(id: number, aReceber: Partial<InsertAReceber>): Promise<AReceber | undefined>;
  deleteAReceber(id: number): Promise<boolean>;

  // Legacy Users
  getUsers(): Promise<User[]>;
  getUserByUid(uid: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;
  
  // Fechamentos (Cash Closings)
  getFechamentos(userId?: string, lojaId?: string, date?: string): Promise<Fechamento[]>;
  getFechamentoById(id: number): Promise<Fechamento | undefined>;
  createFechamento(fechamento: InsertFechamento): Promise<Fechamento>;
  updateFechamento(id: number, fechamento: Partial<InsertFechamento>): Promise<Fechamento | undefined>;
  deleteFechamento(id: number): Promise<boolean>;
  
  // Receivables
  getReceivables(fechamentoId?: number, userId?: string, status?: string): Promise<Receivable[]>;
  createReceivable(receivable: InsertReceivable): Promise<Receivable>;
  updateReceivableStatus(id: number, status: string, dataPagamento?: Date, dataBaixa?: Date): Promise<Receivable | undefined>;
  
  // Authentication helpers
  authenticateUser(email: string, password: string): Promise<User | null>;
  getLojaIdFromEmail(email: string): string | null;

  // Legacy methods for compatibility
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
  // Novas tabelas especificadas
  private usuarios: Map<number, Usuario>;
  private entradas: Map<number, Entrada>;
  private entradasEletronicas: Map<number, EntradaEletronica>;
  private saidas: Map<number, Saida>;
  private aReceber: Map<number, AReceber>;
  
  // Cash closing system data (legacy)
  private users: Map<number, User>;
  private fechamentos: Map<number, Fechamento>;
  private receivables: Map<number, Receivable>;
  
  // Legacy data structures
  private products: Map<number, Product>;
  private transactions: Map<string, Transaction>;
  private transactionItems: Map<string, TransactionItem[]>;
  private registerSessions: Map<number, RegisterSession>;
  
  // ID counters
  private currentUsuarioId: number;
  private currentEntradaId: number;
  private currentEntradaEletronicaId: number;
  private currentSaidaId: number;
  private currentAReceberId: number;
  private currentUserId: number;
  private currentFechamentoId: number;
  private currentReceivableId: number;
  private currentProductId: number;
  private currentTransactionId: number;
  private currentSessionId: number;

  constructor() {
    // Initialize new tables
    this.usuarios = new Map();
    this.entradas = new Map();
    this.entradasEletronicas = new Map();
    this.saidas = new Map();
    this.aReceber = new Map();
    
    // Initialize cash closing system data
    this.users = new Map();
    this.fechamentos = new Map();
    this.receivables = new Map();
    
    // Initialize legacy data
    this.products = new Map();
    this.transactions = new Map();
    this.transactionItems = new Map();
    this.registerSessions = new Map();
    
    // Initialize ID counters
    this.currentUsuarioId = 1;
    this.currentEntradaId = 1;
    this.currentEntradaEletronicaId = 1;
    this.currentSaidaId = 1;
    this.currentAReceberId = 1;
    this.currentUserId = 1;
    this.currentFechamentoId = 1;
    this.currentReceivableId = 1;
    this.currentProductId = 1;
    this.currentTransactionId = 1;
    this.currentSessionId = 1;

    // Initialize with sample data
    this.initializeData();
  }

  private initializeData() {
    // Initialize sample usuarios (nova estrutura)
    const sampleUsuarios: Usuario[] = [
      {
        id: 1,
        nome: 'Administrador Sistema',
        email: 'admin@sistema.com',
        senha: 'admin123',
        tipoUsuario: 'admin'
      },
      {
        id: 2,
        nome: 'João Funcionário',
        email: 'joao@sistema.com',
        senha: 'func123',
        tipoUsuario: 'funcionario'
      }
    ];

    sampleUsuarios.forEach(usuario => {
      this.usuarios.set(usuario.id, usuario);
      this.currentUsuarioId = Math.max(this.currentUsuarioId, usuario.id + 1);
    });

    // Initialize sample entradas
    const currentDate = new Date();
    const sampleEntradas: Entrada[] = [
      {
        id: 1,
        valor: "100.50",
        descricao: "Venda de produto",
        data: currentDate.toISOString().split('T')[0],
        hora: "10:30:00",
        usuarioId: 1
      }
    ];

    sampleEntradas.forEach(entrada => {
      this.entradas.set(entrada.id, entrada);
      this.currentEntradaId = Math.max(this.currentEntradaId, entrada.id + 1);
    });

    // Initialize sample entradas eletrônicas
    const sampleEntradasEletronicas: EntradaEletronica[] = [
      {
        id: 1,
        valor: "250.00",
        formaPagamento: "PIX",
        descricao: "Pagamento eletrônico",
        data: today.toISOString().split('T')[0],
        hora: "14:15:00",
        usuarioId: 1
      }
    ];

    sampleEntradasEletronicas.forEach(entrada => {
      this.entradasEletronicas.set(entrada.id, entrada);
      this.currentEntradaEletronicaId = Math.max(this.currentEntradaEletronicaId, entrada.id + 1);
    });

    // Initialize sample saídas
    const sampleSaidas: Saida[] = [
      {
        id: 1,
        valor: "50.00",
        descricao: "Combustível",
        data: today.toISOString().split('T')[0],
        hora: "09:00:00",
        usuarioId: 1
      }
    ];

    sampleSaidas.forEach(saida => {
      this.saidas.set(saida.id, saida);
      this.currentSaidaId = Math.max(this.currentSaidaId, saida.id + 1);
    });

    // Initialize sample a receber
    const sampleAReceber: AReceber[] = [
      {
        id: 1,
        valor: "300.00",
        cliente: "Cliente XYZ",
        descricao: "Serviço prestado",
        data: today.toISOString().split('T')[0],
        hora: "16:45:00",
        usuarioId: 1
      }
    ];

    sampleAReceber.forEach(aReceber => {
      this.aReceber.set(aReceber.id, aReceber);
      this.currentAReceberId = Math.max(this.currentAReceberId, aReceber.id + 1);
    });

    // Initialize users based on the original Firebase mapping (legacy)
    const sampleUsers: User[] = [
      {
        id: 1,
        uid: 'txxp9hdSthOmlDKGipwduZJNNak1',
        email: 'adm@topvistorias.com',
        name: 'Administrador',
        lojaId: 'admin',
        role: 'admin',
        createdAt: new Date()
      },
      {
        id: 2,
        uid: 'ijNp5AAiFvWrBFCVq7hQ9L05d5Q2',
        email: 'topcapaobonito@hotmail.com',
        name: 'Operador Capão Bonito',
        lojaId: 'capao',
        role: 'user',
        createdAt: new Date()
      },
      {
        id: 3,
        uid: 'user_guapiara_123',
        email: 'topguapiara@hotmail.com',
        name: 'Operador Guapiara',
        lojaId: 'guapiara',
        role: 'user',
        createdAt: new Date()
      },
      {
        id: 4,
        uid: 'user_ribeirao_456',
        email: 'topribeiraobranco@hotmail.com',
        name: 'Operador Ribeirão Branco',
        lojaId: 'ribeirao',
        role: 'user',
        createdAt: new Date()
      }
    ];

    sampleUsers.forEach(user => {
      this.users.set(user.id, user);
      this.currentUserId = Math.max(this.currentUserId, user.id + 1);
    });

    // Sample fechamento data
    const today = new Date().toISOString().split('T')[0];
    const sampleFechamento: Fechamento = {
      id: 1,
      dataFechamento: today,
      lojaId: 'capao',
      userId: 'ijNp5AAiFvWrBFCVq7hQ9L05d5Q2',
      operatorName: 'Operador Capão Bonito',
      
      // Entradas
      carros: '2400.00',
      carrosQuantidade: 12,
      motos: '800.00',
      motosQuantidade: 8,
      caminhoes: '600.00',
      caminhoesQuantidade: 3,
      
      // Saídas Fixas
      aluguel: '800.00',
      energia: '150.00',
      funcionario: '1200.00',
      despachante: '300.00',
      
      // JSON fields
      saidasVariaveis: JSON.stringify([
        { id: '1', description: 'Material de limpeza', amount: 50.00, icon: 'cleaning' },
        { id: '2', description: 'Combustível', amount: 120.00, icon: 'fuel' }
      ]),
      pagamentosRecebidos: JSON.stringify([
        { id: '1', nomeCliente: 'João Silva', placa: 'ABC-1234', valorPago: 200.00, formaPagamento: 'Dinheiro' }
      ]),
      aReceber: JSON.stringify([
        { id: '1', nomeCliente: 'Maria Santos', placa: 'XYZ-5678', valorReceber: 180.00, dataDebito: today }
      ]),
      
      // Calculated totals
      totalEntradas: '3800.00',
      totalSaidasFixas: '2450.00',
      totalSaidasVariaveis: '170.00',
      totalSaidas: '2620.00',
      totalPagamentosRecebidos: '200.00',
      totalAReceber: '180.00',
      saldoFinal: '1380.00',
      
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.fechamentos.set(1, sampleFechamento);
    this.currentFechamentoId = 2;

    // Legacy data for compatibility
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

    const session: RegisterSession = {
      id: 1,
      date: today,
      isOpen: true,
      openingBalance: '200.00',
      currentBalance: '847.30',
      expectedBalance: '847.30',
      physicalBalance: null,
      reconciled: false,
      operatorName: 'Sistema'
    };
    this.registerSessions.set(1, session);
  }

  // =============================================================
  // MÉTODOS PARA AS NOVAS TABELAS ESPECIFICADAS
  // =============================================================

  // Usuarios methods
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

  // Entradas methods
  async getEntradas(usuarioId?: number, data?: string): Promise<Entrada[]> {
    let entradas = Array.from(this.entradas.values());

    if (usuarioId) {
      entradas = entradas.filter(e => e.usuarioId === usuarioId);
    }
    if (data) {
      entradas = entradas.filter(e => e.data === data);
    }

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

  // Entradas Eletrônicas methods
  async getEntradasEletronicas(usuarioId?: number, data?: string): Promise<EntradaEletronica[]> {
    let entradas = Array.from(this.entradasEletronicas.values());

    if (usuarioId) {
      entradas = entradas.filter(e => e.usuarioId === usuarioId);
    }
    if (data) {
      entradas = entradas.filter(e => e.data === data);
    }

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

  // Saídas methods
  async getSaidas(usuarioId?: number, data?: string): Promise<Saida[]> {
    let saidas = Array.from(this.saidas.values());

    if (usuarioId) {
      saidas = saidas.filter(s => s.usuarioId === usuarioId);
    }
    if (data) {
      saidas = saidas.filter(s => s.data === data);
    }

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

  // A Receber methods
  async getAReceber(usuarioId?: number, data?: string): Promise<AReceber[]> {
    let aReceber = Array.from(this.aReceber.values());

    if (usuarioId) {
      aReceber = aReceber.filter(a => a.usuarioId === usuarioId);
    }
    if (data) {
      aReceber = aReceber.filter(a => a.data === data);
    }

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

  // =============================================================
  // MÉTODOS LEGACY (MANTIDOS PARA COMPATIBILIDADE)
  // =============================================================

  // User management methods
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

  // Fechamentos management methods
  async getFechamentos(userId?: string, lojaId?: string, date?: string): Promise<Fechamento[]> {
    let fechamentos = Array.from(this.fechamentos.values());

    if (userId) {
      fechamentos = fechamentos.filter(f => f.userId === userId);
    }
    if (lojaId) {
      fechamentos = fechamentos.filter(f => f.lojaId === lojaId);
    }
    if (date) {
      fechamentos = fechamentos.filter(f => f.dataFechamento === date);
    }

    return fechamentos.sort((a, b) => new Date(b.dataFechamento).getTime() - new Date(a.dataFechamento).getTime());
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

    const updatedFechamento = { 
      ...fechamento, 
      ...updateData, 
      updatedAt: new Date() 
    };
    this.fechamentos.set(id, updatedFechamento);
    return updatedFechamento;
  }

  async deleteFechamento(id: number): Promise<boolean> {
    return this.fechamentos.delete(id);
  }

  // Receivables management methods
  async getReceivables(fechamentoId?: number, userId?: string, status?: string): Promise<Receivable[]> {
    let receivables = Array.from(this.receivables.values());

    if (fechamentoId) {
      receivables = receivables.filter(r => r.fechamentoId === fechamentoId);
    }
    if (userId) {
      receivables = receivables.filter(r => r.userId === userId);
    }
    if (status) {
      receivables = receivables.filter(r => r.status === status);
    }

    return receivables.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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
      dataPagamento: dataPagamento || receivable.dataPagamento,
      dataBaixa: dataBaixa || receivable.dataBaixa
    };
    this.receivables.set(id, updatedReceivable);
    return updatedReceivable;
  }

  // Authentication helper methods
  async authenticateUser(email: string, password: string): Promise<User | null> {
    // Simple authentication - in real app you'd hash passwords
    const user = await this.getUserByEmail(email);
    if (user) {
      // For demo purposes, accept any password for existing users
      return user;
    }
    return null;
  }

  getLojaIdFromEmail(email: string): string | null {
    if (!email) return null;
    
    if (email === "topguapiara@hotmail.com") return "guapiara";
    if (email === "topribeiraobranco@hotmail.com") return "ribeirao";
    if (email === "topcapaobonito@hotmail.com") return "capao";
    if (email === "adm@topvistorias.com") return "admin";
    
    return null;
  }

  // Legacy methods for compatibility
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
