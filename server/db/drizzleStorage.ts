import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/schema';
import { eq, sql, and, asc, desc } from 'drizzle-orm';

import { IStorage } from '../storage';
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
  DailyStats,
  Entrance,
  VariableExit,
  ReceivableInput
} from "@shared/schema";

// Assumindo que a instância `db` já está configurada em server/db/index.ts
import { db } from './index';
import { 
  fechamentos as backendFechamentosTable,
  usuarios as usuariosTable,
  aReceber as aReceberTable,
  saidasOperacionais as backendSaidasOperacionaisTable,
  entradas as backendEntradasTable,
  entradasEletronicas as backendEntradasEletronicasTable
} from '../models/schema';

// Tipos auxiliares para mapeamento do DB
// Usamos string para campos NUMERIC e DATE pois é assim que Drizzle ORM com driver pg os lê por padrão
interface EntradaComumDB {
  id: number;
  data: string;
  operador: string;
  lojaId: string;
  userId: string;
  carro: number | null;
  moto: number | null;
  caminhonete: number | null;
  caminhao: number | null;
  revistoriaDetran: number | null;
  revistoriaLoja: number | null;
  cautelar: number | null;
  pesquisa: number | null;
}

interface EntradaEletronicaDB {
  id: number;
  data: string;
  operador: string;
  lojaId: string;
  userId: string;
  tipo: string;
  valor: string; // Numeric no DB, lido como string
}

interface SaidaOperacionalDB {
  id: number;
  data: string;
  operador: string;
  lojaId: string;
  userId: string;
  nome: string;
  valor: string;
  dataPagamento: string | null;
}

interface ContaReceberDB {
  id: number;
  data: string;
  operador: string;
  lojaId: string;
  userId: string;
  nome: string;
  placa: string;
  valor: string;
  pago: boolean;
  dataPagamento: string | null;
}

interface FechamentoPrincipalDB {
  id: number;
  data: string;
  operador: string;
  lojaId: string;
  userId: string;
  aluguel: string;
  energia: string;
  funcionario: string;
  despachante: string;
  total_entradas: string;
  total_saidas_fixas: string;
  total_saidas_variaveis: string;
  total_saidas: string;
  total_pagamentos_recebidos: string;
  total_a_receber: string;
  saldo_final: string;
  createdAt: string;
  updatedAt: string;
}

interface InsertFechamento {
  dataFechamento: string;
  lojaId: string;
  userId: string;
  operatorName: string;
  carros: string;
  carrosQuantidade: number;
  motos: string;
  motosQuantidade: number;
  caminhoes: string;
  caminhoesQuantidade: number;
  aluguel: string;
  energia: string;
  funcionario: string;
  despachante: string;
  saidasVariaveis: string;
  pagamentosRecebidos: string;
  aReceber: string;
  totalEntradas: string;
  totalSaidasFixas: string;
  totalSaidasVariaveis: string;
  totalSaidas: string;
  totalPagamentosRecebidos: string;
  totalAReceber: string;
  saldoFinal: string;
  pix?: string;
  cartao?: string;
  deposito?: string;
}

export class DrizzleStorage implements IStorage {
  // Implementação dos métodos da interface IStorage usando Drizzle ORM

  // --- Métodos de Fechamentos ---
  async getFechamentos(userId?: string, lojaId?: string, date?: string): Promise<Fechamento[]> {
    if (!lojaId) {
      console.error("getFechamentos chamado sem lojaId.");
      return [];
    }

    const query = db.select().from(backendFechamentosTable);

    if (userId) {
      query.where(eq(backendFechamentosTable.userId, userId));
    }

    if (date) {
      query.where(eq(backendFechamentosTable.data, date));
    } else {
      query.orderBy(desc(backendFechamentosTable.data));
      query.limit(4);
    }

    const result = await query.execute() as FechamentoPrincipalDB[];

    console.warn("getFechamentos na DrizzleStorage retorna apenas dados da tabela principal de fechamentos.");
    
    const fechamentosSimplificados: Fechamento[] = result.map((f: FechamentoPrincipalDB) => ({
      id: f.id,
      dataFechamento: f.data,
      lojaId: f.lojaId,
      userId: f.userId,
      operatorName: f.operador,
      carros: "0",
      carrosQuantidade: 0,
      motos: "0",
      motosQuantidade: 0,
      caminhoes: "0",
      caminhoesQuantidade: 0,
      caminhonetes: "0.00",
      caminhonetesQuantidade: 0,
      revistoriaDetran: "0.00",
      revistoriaDetranQuantidade: 0,
      revistoriaLoja: "0.00",
      revistoriaLojaQuantidade: 0,
      cautelar: "0.00",
      cautelarQuantidade: 0,
      pesquisa: "0.00",
      pesquisaQuantidade: 0,
      aluguel: f.aluguel,
      energia: f.energia,
      funcionario: f.funcionario,
      despachante: f.despachante,
      saidasVariaveis: "[]",
      pagamentosRecebidos: "[]",
      aReceber: "[]",
      totalEntradas: f.total_entradas,
      totalSaidasFixas: "0.00",
      totalSaidasVariaveis: "0.00",
      totalSaidas: f.total_saidas,
      totalPagamentosRecebidos: f.total_pagamentos_recebidos,
      totalAReceber: f.total_a_receber,
      saldoFinal: f.saldo_final,
      createdAt: new Date(f.createdAt),
      updatedAt: new Date(f.updatedAt),
    }));

    return fechamentosSimplificados;
  }

  async getFechamentoById(id: number): Promise<Fechamento | undefined> {
    // Buscar o registro principal do fechamento
    const fechamentoPrincipalResult = await db.select().from(backendFechamentosTable)
      .where(eq(backendFechamentosTable.id, id))
      .limit(1).execute();

    if (!fechamentoPrincipalResult || fechamentoPrincipalResult.length === 0) {
      return undefined;
    }
    const principal: FechamentoPrincipalDB = fechamentoPrincipalResult[0];

    // Buscar dados relacionados usando data, operador, lojaId e userId
    // Nota: A correlação por data/operador/lojaId/userId pode não ser robusta se houver múltiplos fechamentos no mesmo dia pelo mesmo operador na mesma loja.
    // O ideal seria vincular entradas/saidas/aReceber diretamente ao ID do fechamento principal.
    // Adaptando o mapeamento existente para tentar funcionar com a estrutura atual.
    const dataF = principal.data;
    const operadorF = principal.operador;
    const lojaIdF = principal.lojaId;
    const userIdF = principal.userId;

    // Buscar entradas comuns associadas
    const entradasComunsDB = await db.select().from(backendEntradasTable)
      .where(and(
        eq(backendEntradasTable.data, dataF),
        eq(backendEntradasTable.operador, operadorF),
        eq(backendEntradasTable.lojaId, lojaIdF),
        eq(backendEntradasTable.userId, userIdF)
      ))
      .execute() as EntradaComumDB[]; // Cast para o tipo auxiliar

    // Buscar entradas eletrônicas associadas
    const entradasEletronicasDB = await db.select().from(backendEntradasEletronicasTable)
      .where(and(
        eq(backendEntradasEletronicasTable.data, dataF),
        eq(backendEntradasEletronicasTable.operador, operadorF),
        eq(backendEntradasEletronicasTable.lojaId, lojaIdF),
        eq(backendEntradasEletronicasTable.userId, userIdF)
      ))
      .execute() as EntradaEletronicaDB[]; // Cast para o tipo auxiliar

    // Buscar saídas operacionais associadas
    const saidasOperacionaisDB = await db.select().from(backendSaidasOperacionaisTable)
      .where(and(
        eq(backendSaidasOperacionaisTable.data, dataF),
        eq(backendSaidasOperacionaisTable.operador, operadorF),
        eq(backendSaidasOperacionaisTable.lojaId, lojaIdF),
        eq(backendSaidasOperacionaisTable.userId, userIdF)
      ))
      .execute() as SaidaOperacionalDB[]; // Cast para o tipo auxiliar

    // Buscar contas a receber associadas
    const aReceberDB = await db.select().from(aReceberTable)
      .where(and(
        eq(aReceberTable.data, dataF),
        eq(aReceberTable.operador, operadorF),
        eq(aReceberTable.lojaId, lojaIdF),
        eq(aReceberTable.userId, userIdF)
      ))
      .execute() as ContaReceberDB[]; // Cast para o tipo auxiliar

    // Mapear os dados do DB para o tipo Fechamento do @shared/schema
    const fechamentoCompleto: Fechamento = {
      id: principal.id,
      dataFechamento: principal.data,
      lojaId: principal.lojaId,
      userId: principal.userId,
      operatorName: principal.operador,

      // Mapear quantidades e valores de entradas comuns da tabela de entradas
      // Usar valores unitários (VISTORIA_VALUES) que viriam do frontend ou config para calcular os totais aqui no backend, 
      // ou confiar que o frontend enviou os totais corretos no insertFechamento.
      // Pelo schema do backend, os campos como 'carros', 'motos' na tabela 'fechamentos' parecem ser totais, não unitários multiplicados.
      // Vamos mapear as quantidades da tabela 'entradas' e os totais da tabela 'fechamentos'.
      carros: "0",
      carrosQuantidade: entradasComunsDB[0]?.carro || 0, // Quantidade vem da tabela de entradas
      motos: "0",
      motosQuantidade: entradasComunsDB[0]?.moto || 0,
      caminhoes: "0",
      caminhoesQuantidade: entradasComunsDB[0]?.caminhao || 0,
      caminhonetes: "0.00",
      caminhonetesQuantidade: entradasComunsDB[0]?.caminhonete || 0,
      revistoriaDetran: "0.00",
      revistoriaDetranQuantidade: entradasComunsDB[0]?.revistoriaDetran || 0,
      revistoriaLoja: "0.00",
      revistoriaLojaQuantidade: entradasComunsDB[0]?.revistoriaLoja || 0,
      cautelar: "0.00",
      cautelarQuantidade: entradasComunsDB[0]?.cautelar || 0,
      pesquisa: "0.00",
      pesquisaQuantidade: entradasComunsDB[0]?.pesquisa || 0,

      // Mapear valores de saídas fixas da tabela principal
      aluguel: principal.aluguel,
      energia: principal.energia,
      funcionario: principal.funcionario,
      despachante: principal.despachante,

      // Mapear saídas variáveis (operacionais)
      saidasVariaveis: "[]",

      // pagamentosRecebidos - Mapear entradas eletrônicas e talvez outros tipos de pagamentos recebidos
      // Assumindo por enquanto que 'pagamentosRecebidos' no schema @shared deve incluir entradas eletrônicas
      pagamentosRecebidos: "[]",

      // Mapear contas a receber
      aReceber: "[]",

      // Mapear totais da tabela principal
      totalEntradas: principal.total_entradas,
      totalSaidasFixas: "0.00",
      totalSaidasVariaveis: "0.00",
      totalSaidas: principal.total_saidas,
      totalPagamentosRecebidos: principal.total_pagamentos_recebidos,
      totalAReceber: principal.total_a_receber,
      saldoFinal: principal.saldo_final,

      // Converter strings de data para objetos Date
      createdAt: new Date(principal.createdAt), 
      updatedAt: new Date(principal.updatedAt),
    };

    console.warn("getFechamentoById na DrizzleStorage realiza mapeamento complexo. Verificar lógica de cálculo de totais de vistoria.");

    return fechamentoCompleto;
  }

  async createFechamento(insertFechamento: InsertFechamento): Promise<Fechamento> {
    try {
      const result = await db.transaction(async (tx) => {
        const fechamentoPrincipalData = {
          data: insertFechamento.dataFechamento,
          operador: insertFechamento.operatorName,
          lojaId: insertFechamento.lojaId,
          userId: insertFechamento.userId,
          aluguel: insertFechamento.aluguel || "0",
          energia: insertFechamento.energia || "0",
          funcionario: insertFechamento.funcionario || "0",
          despachante: insertFechamento.despachante || "0",
          total_entradas: insertFechamento.totalEntradas || "0",
          total_saidas_fixas: insertFechamento.totalSaidasFixas || "0",
          total_saidas_variaveis: insertFechamento.totalSaidasVariaveis || "0",
          total_saidas: insertFechamento.totalSaidas || "0",
          total_pagamentos_recebidos: insertFechamento.totalPagamentosRecebidos || "0",
          total_a_receber: insertFechamento.totalAReceber || "0",
          saldo_final: insertFechamento.saldoFinal || "0",
        };

        const [insertedFechamentoPrincipal] = await tx
          .insert(backendFechamentosTable)
          .values(fechamentoPrincipalData)
          .returning();

        if (!insertedFechamentoPrincipal) {
          throw new Error('Falha ao inserir registro principal de fechamento.');
        }

        const fechamentoId = insertedFechamentoPrincipal.id;

        const entradasData = {
          data: insertFechamento.dataFechamento,
          operador: insertFechamento.operatorName,
          lojaId: insertFechamento.lojaId,
          userId: insertFechamento.userId,
          carro: insertFechamento.carrosQuantidade || 0,
          moto: insertFechamento.motosQuantidade || 0,
          caminhonete: insertFechamento.caminhonetesQuantidade || 0,
          caminhao: insertFechamento.caminhoesQuantidade || 0,
          revistoriaDetran: insertFechamento.revistoriaDetranQuantidade || 0,
          revistoriaLoja: insertFechamento.revistoriaLojaQuantidade || 0,
          cautelar: insertFechamento.cautelarQuantidade || 0,
          pesquisa: insertFechamento.pesquisaQuantidade || 0,
        };

        const hasEntradasComuns = Object.values(entradasData).some(
          (value) => typeof value === 'number' && value > 0
        );

        if (hasEntradasComuns) {
          await tx.insert(backendEntradasTable).values(entradasData);
        }

        const entradasEletronicasToInsert = [
          {
            tipo: 'Pix',
            valor: insertFechamento.pix || "0",
            data: insertFechamento.dataFechamento,
            operador: insertFechamento.operatorName,
            lojaId: insertFechamento.lojaId,
            userId: insertFechamento.userId,
          },
          {
            tipo: 'Cartão',
            valor: insertFechamento.cartao || "0",
            data: insertFechamento.dataFechamento,
            operador: insertFechamento.operatorName,
            lojaId: insertFechamento.lojaId,
            userId: insertFechamento.userId,
          },
          {
            tipo: 'Depósito',
            valor: insertFechamento.deposito || "0",
            data: insertFechamento.dataFechamento,
            operador: insertFechamento.operatorName,
            lojaId: insertFechamento.lojaId,
            userId: insertFechamento.userId,
          },
        ]
          .filter((entrada) => parseFloat(entrada.valor) > 0)
          .map((entrada) => ({
            ...entrada,
            valor: entrada.valor,
          }));

        if (entradasEletronicasToInsert.length > 0) {
          await tx.insert(backendEntradasEletronicasTable).values(entradasEletronicasToInsert);
        }

        const saidasOperacionaisData: VariableExit[] = JSON.parse(insertFechamento.saidasVariaveis);
        const saidasOperacionaisToInsert = saidasOperacionaisData.map((saida) => ({
          data: insertFechamento.dataFechamento,
          operador: insertFechamento.operatorName,
          lojaId: insertFechamento.lojaId,
          userId: insertFechamento.userId,
          nome: saida.description,
          valor: saida.amount.toString(),
          dataPagamento: null,
        }));

        if (saidasOperacionaisToInsert.length > 0) {
          await tx.insert(backendSaidasOperacionaisTable).values(saidasOperacionaisToInsert);
        }

        const aReceberData: ReceivableInput[] = JSON.parse(insertFechamento.aReceber);
        const aReceberToInsert = aReceberData.map((item) => ({
          data: item.dataDebito || insertFechamento.dataFechamento,
          operador: insertFechamento.operatorName,
          lojaId: insertFechamento.lojaId,
          userId: insertFechamento.userId,
          nome: item.nomeCliente,
          placa: item.placa,
          valor: item.valorReceber.toString(),
          pago: false,
          dataPagamento: null,
        }));

        if (aReceberToInsert.length > 0) {
          await tx.insert(aReceberTable).values(aReceberToInsert);
        }

        const novoFechamentoCompleto = await this.getFechamentoById(fechamentoId);
        if (!novoFechamentoCompleto) {
          throw new Error('Falha inesperada ao recuperar o fechamento recém-criado.');
        }

        return novoFechamentoCompleto;
      });

      return result;
    } catch (error) {
      console.error('Erro na transação createFechamento:', error);
      throw error;
    }
  }

  // Métodos de atualização e exclusão (não implementados ainda)
  async updateFechamento(id: number, fechamento: Partial<InsertFechamento>): Promise<Fechamento | undefined> { console.warn('atualizarFechamento não implementado em DrizzleStorage'); return undefined; }
  async deleteFechamento(id: number): Promise<boolean> { console.warn('deletarFechamento não implementado em DrizzleStorage'); return false; }

  // --- Métodos de Recebíveis ---
  // TODO: Implementar estes métodos usando Drizzle ORM
  async getReceivables(fechamentoId?: number, userId?: string, status?: string): Promise<Receivable[]> { console.warn('getReceivables não implementado em DrizzleStorage'); return []; }
  async createReceivable(insertReceivable: InsertReceivable): Promise<Receivable> { console.warn('createReceivable não implementado em DrizzleStorage'); throw new Error('Não implementado'); }
  async updateReceivableStatus(id: number, status: string, dataPagamento?: Date, dataBaixa?: Date): Promise<Receivable | undefined> { console.warn('updateReceivableStatus não implementado em DrizzleStorage'); return undefined; }

  // --- Métodos de Usuários ---
  // TODO: Implementar estes métodos usando Drizzle ORM
  async getUsers(): Promise<User[]> { console.warn('getUsers não implementado em DrizzleStorage'); return []; }
  async getUserByUid(uid: string): Promise<User | undefined> { console.warn('getUserByUid não implementado em DrizzleStorage'); return undefined; }
  async getUserByEmail(email: string): Promise<User | undefined> { console.warn('getUserByEmail não implementado em DrizzleStorage'); return undefined; }
  async createUser(user: InsertUser): Promise<User> { console.warn('createUser não implementado em DrizzleStorage'); throw new Error('Não implementado'); }
  async updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined> { console.warn('updateUser não implementado em DrizzleStorage'); return undefined; }
  async authenticateUser(email: string, password: string): Promise<User | null> { console.warn('authenticateUser não implementado em DrizzleStorage'); return null; }
  getLojaIdFromEmail(email: string): string | null { console.warn('getLojaIdFromEmail não implementado em DrizzleStorage'); return null; }

  // --- Métodos de Produtos ---
  // TODO: Implementar estes métodos usando Drizzle ORM
  async getProducts(): Promise<Product[]> { console.warn('getProducts não implementado em DrizzleStorage'); return []; }
  async getProductByCode(code: string): Promise<Product | undefined> { console.warn('getProductByCode não implementado em DrizzleStorage'); return undefined; }
  async createProduct(product: InsertProduct): Promise<Product> { console.warn('createProduct não implementado em DrizzleStorage'); throw new Error('Não implementado'); }
  async updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product | undefined> { console.warn('updateProduct não implementado em DrizzleStorage'); return undefined; }
  async deleteProduct(id: number): Promise<boolean> { console.warn('deleteProduct não implementado em DrizzleStorage'); return false; }
  async updateProductStock(code: string, quantity: number): Promise<boolean> { console.warn('updateProductStock não implementado em DrizzleStorage'); return false; }

  // --- Métodos de Transações ---
  // TODO: Implementar estes métodos usando Drizzle ORM
  async getTransactions(): Promise<(Transaction & { items: TransactionItem[] })[]> { console.warn('getTransactions não implementado em DrizzleStorage'); return []; }
  async getTransactionById(id: string): Promise<(Transaction & { items: TransactionItem[] }) | undefined> { console.warn('getTransactionById não implementado em DrizzleStorage'); return undefined; }
  async createTransaction(transaction: InsertTransaction, items: InsertTransactionItem[]): Promise<Transaction> { console.warn('createTransaction não implementado em DrizzleStorage'); throw new Error('Não implementado'); }

  // --- Métodos de Sessão de Caixa ---
  // TODO: Implementar estes métodos usando Drizzle ORM
  async getCurrentRegisterSession(): Promise<RegisterSession | undefined> { console.warn('getCurrentRegisterSession não implementado em DrizzleStorage'); return undefined; }
  async createRegisterSession(session: InsertRegisterSession): Promise<RegisterSession> { console.warn('createRegisterSession não implementado em DrizzleStorage'); throw new Error('Não implementado'); }
  async updateRegisterSession(id: number, session: Partial<InsertRegisterSession>): Promise<RegisterSession | undefined> { console.warn('updateRegisterSession não implementado em DrizzleStorage'); return undefined; }

  // --- Métodos de Estatísticas Diárias ---
  // TODO: Implementar estes métodos usando Drizzle ORM
  async getDailyStats(date?: string): Promise<DailyStats> { console.warn('getDailyStats não implementado em DrizzleStorage'); return {} as DailyStats; }
}

export const storage = new DrizzleStorage(); 