import { Request, Response } from 'express';
import { db } from '../db';
import { saidasOperacionais } from '../models/schema';
import { eq } from 'drizzle-orm';

export const saidasOperacionaisController = {
  async listar(req: Request, res: Response) {
    try {
      const todasSaidas = await db.select().from(saidasOperacionais);
      res.json(todasSaidas);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao listar saídas operacionais' });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saida = await db.select().from(saidasOperacionais).where(eq(saidasOperacionais.id, Number(id)));
      
      if (!saida.length) {
        return res.status(404).json({ erro: 'Saída operacional não encontrada' });
      }

      res.json(saida[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar saída operacional' });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const novaSaida = await db.insert(saidasOperacionais).values(req.body).returning();
      res.status(201).json(novaSaida[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar saída operacional' });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saidaAtualizada = await db
        .update(saidasOperacionais)
        .set(req.body)
        .where(eq(saidasOperacionais.id, Number(id)))
        .returning();

      if (!saidaAtualizada.length) {
        return res.status(404).json({ erro: 'Saída operacional não encontrada' });
      }

      res.json(saidaAtualizada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar saída operacional' });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saidaDeletada = await db
        .delete(saidasOperacionais)
        .where(eq(saidasOperacionais.id, Number(id)))
        .returning();

      if (!saidaDeletada.length) {
        return res.status(404).json({ erro: 'Saída operacional não encontrada' });
      }

      res.json({ mensagem: 'Saída operacional deletada com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao deletar saída operacional' });
    }
  },

  async registrarPagamento(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { data_pagamento } = req.body;

      const saidaAtualizada = await db
        .update(saidasOperacionais)
        .set({ dataPagamento: data_pagamento })
        .where(eq(saidasOperacionais.id, Number(id)))
        .returning();

      if (!saidaAtualizada.length) {
        return res.status(404).json({ erro: 'Saída operacional não encontrada' });
      }

      res.json(saidaAtualizada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao registrar pagamento' });
    }
  }
}; 