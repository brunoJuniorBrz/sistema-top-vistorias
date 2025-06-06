import { InferModel } from 'drizzle-orm';
import { usuarios, entradas, entradasEletronicas, aReceber, saidas, saidasOperacionais } from './schema';

export type Usuario = InferModel<typeof usuarios>;
export type NewUsuario = InferModel<typeof usuarios, 'insert'>;

export type Entrada = InferModel<typeof entradas>;
export type NewEntrada = InferModel<typeof entradas, 'insert'>;

export type EntradaEletronica = InferModel<typeof entradasEletronicas>;
export type NewEntradaEletronica = InferModel<typeof entradasEletronicas, 'insert'>;

export type AReceber = InferModel<typeof aReceber>;
export type NewAReceber = InferModel<typeof aReceber, 'insert'>;

export type Saida = InferModel<typeof saidas>;
export type NewSaida = InferModel<typeof saidas, 'insert'>;

export type SaidaOperacional = InferModel<typeof saidasOperacionais>;
export type NewSaidaOperacional = InferModel<typeof saidasOperacionais, 'insert'>; 