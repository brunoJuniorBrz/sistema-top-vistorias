import { pgTable, serial, text, date, integer, numeric, boolean } from 'drizzle-orm/pg-core';

// Tabela de Usuários
export const usuarios = pgTable('usuarios', {
  id: serial('id').primaryKey(),
  nome: text('nome').notNull(),
  email: text('email').notNull().unique(),
  senha: text('senha').notNull(),
  tipo: text('tipo').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull()
});

// Tabela de Entradas
export const entradas = pgTable('entradas', {
  id: serial('id').primaryKey(),
  data: date('data').notNull(),
  operador: text('operador').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull(),
  carro: integer('carro'),
  moto: integer('moto'),
  caminhonete: integer('caminhonete'),
  caminhao: integer('caminhao'),
  revistoriaDetran: integer('revistoria_detran'),
  revistoriaLoja: integer('revistoria_loja'),
  cautelar: integer('cautelar'),
  pesquisa: integer('pesquisa')
});

// Tabela de Entradas Eletrônicas
export const entradasEletronicas = pgTable('entradas_eletronicas', {
  id: serial('id').primaryKey(),
  data: date('data').notNull(),
  operador: text('operador').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull(),
  tipo: text('tipo').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull()
});

// Tabela de A Receber
export const aReceber = pgTable('a_receber', {
  id: serial('id').primaryKey(),
  data: date('data').notNull(),
  operador: text('operador').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull(),
  nome: text('nome').notNull(),
  placa: text('placa').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  pago: boolean('pago').default(false)
});

// Tabela de Saídas
export const saidas = pgTable('saidas', {
  id: serial('id').primaryKey(),
  data: date('data').notNull(),
  operador: text('operador').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull(),
  nome: text('nome').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull()
});

// Tabela de Saídas Operacionais
export const saidasOperacionais = pgTable('saidas_operacionais', {
  id: serial('id').primaryKey(),
  data: date('data').notNull(),
  operador: text('operador').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull(),
  nome: text('nome').notNull(),
  valor: numeric('valor', { precision: 10, scale: 2 }).notNull(),
  dataPagamento: date('data_pagamento')
});

// Tabela de Fechamentos
export const fechamentos = pgTable('fechamentos', {
  id: serial('id').primaryKey(),
  data: date('data').notNull(),
  operador: text('operador').notNull(),
  lojaId: text('loja_id').notNull(),
  userId: text('user_id').notNull(),
  aluguel: numeric('aluguel', { precision: 10, scale: 2 }).notNull(),
  energia: numeric('energia', { precision: 10, scale: 2 }).notNull(),
  funcionario: numeric('funcionario', { precision: 10, scale: 2 }).notNull(),
  despachante: numeric('despachante', { precision: 10, scale: 2 }).notNull(),
  total_entradas: numeric('total_entradas', { precision: 10, scale: 2 }).notNull(),
  total_saidas_fixas: numeric('total_saidas_fixas', { precision: 10, scale: 2 }).notNull(),
  total_saidas_variaveis: numeric('total_saidas_variaveis', { precision: 10, scale: 2 }).notNull(),
  total_saidas: numeric('total_saidas', { precision: 10, scale: 2 }).notNull(),
  total_pagamentos_recebidos: numeric('total_pagamentos_recebidos', { precision: 10, scale: 2 }).notNull(),
  total_a_receber: numeric('total_a_receber', { precision: 10, scale: 2 }).notNull(),
  saldo_final: numeric('saldo_final', { precision: 10, scale: 2 }).notNull(),
  createdAt: date('created_at').defaultNow(),
  updatedAt: date('updated_at').defaultNow()
}); 