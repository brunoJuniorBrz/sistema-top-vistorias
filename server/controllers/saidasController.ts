import { Request, Response } from 'express';
import { db } from '../db';
import { saidas } from '../models/schema';
import { eq } from 'drizzle-orm';

export const saidasController = {
  async listar(req: Request, res: Response) {
    try {
      const todasSaidas = await db.select().from(saidas);
      res.json(todasSaidas);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao listar saídas' });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saida = await db.select().from(saidas).where(eq(saidas.id, Number(id)));
      
      if (!saida.length) {
        return res.status(404).json({ erro: 'Saída não encontrada' });
      }

      res.json(saida[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar saída' });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const novaSaida = await db.insert(saidas).values(req.body).returning();
      res.status(201).json(novaSaida[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar saída' });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saidaAtualizada = await db
        .update(saidas)
        .set(req.body)
        .where(eq(saidas.id, Number(id)))
        .returning();

      if (!saidaAtualizada.length) {
        return res.status(404).json({ erro: 'Saída não encontrada' });
      }

      res.json(saidaAtualizada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar saída' });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const saidaDeletada = await db
        .delete(saidas)
        .where(eq(saidas.id, Number(id)))
        .returning();

      if (!saidaDeletada.length) {
        return res.status(404).json({ erro: 'Saída não encontrada' });
      }

      res.json({ mensagem: 'Saída deletada com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao deletar saída' });
    }
  }
}; 