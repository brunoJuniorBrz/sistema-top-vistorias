import { z } from 'zod';

export const insertFechamentoSchema = z.object({
  dataFechamento: z.string(),
  lojaId: z.string(),
  userId: z.string(),
  operatorName: z.string(),

  // Entradas
  carros: z.string(),
  carrosQuantidade: z.number(),
  motos: z.string(),
  motosQuantidade: z.number(),
  caminhoes: z.string(),
  caminhoesQuantidade: z.number(),
  caminhonetes: z.string().optional(),
  caminhonetesQuantidade: z.number().optional(),
  revistoriaDetran: z.string().optional(),
  revistoriaDetranQuantidade: z.number().optional(),
  revistoriaLoja: z.string().optional(),
  revistoriaLojaQuantidade: z.number().optional(),
  cautelar: z.string().optional(),
  cautelarQuantidade: z.number().optional(),
  pesquisa: z.string().optional(),
  pesquisaQuantidade: z.number().optional(),

  // Entradas Eletrônicas
  pix: z.string(),
  cartao: z.string(),
  deposito: z.string(),

  // Saídas Fixas
  aluguel: z.string(),
  energia: z.string(),
  funcionario: z.string(),
  despachante: z.string(),

  // Saídas Variáveis e Contas a Receber
  saidasVariaveis: z.string(),
  pagamentosRecebidos: z.string(),
  aReceber: z.string(),

  // Totais
  totalEntradas: z.string(),
  totalSaidasFixas: z.string(),
  totalSaidasVariaveis: z.string(),
  totalSaidas: z.string(),
  totalPagamentosRecebidos: z.string(),
  totalAReceber: z.string(),
  saldoFinal: z.string(),
}); 