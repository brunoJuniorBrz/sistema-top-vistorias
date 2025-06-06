import { Request, Response } from 'express';
import { db } from '../db';
import { entradas } from '../models/schema';
import { eq } from 'drizzle-orm';

export const entradasController = {
  // Listar todas as entradas
  async listar(req: Request, res: Response) {
    try {
      const todasEntradas = await db.select().from(entradas);
      res.json(todasEntradas);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao listar entradas' });
    }
  },

  // Buscar uma entrada específica
  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entrada = await db.select().from(entradas).where(eq(entradas.id, Number(id)));
      
      if (!entrada.length) {
        return res.status(404).json({ erro: 'Entrada não encontrada' });
      }

      res.json(entrada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar entrada' });
    }
  },

  // Criar nova entrada
  async criar(req: Request, res: Response) {
    try {
      const novaEntrada = await db.insert(entradas).values(req.body).returning();
      res.status(201).json(novaEntrada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar entrada' });
    }
  },

  // Atualizar entrada
  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entradaAtualizada = await db
        .update(entradas)
        .set(req.body)
        .where(eq(entradas.id, Number(id)))
        .returning();

      if (!entradaAtualizada.length) {
        return res.status(404).json({ erro: 'Entrada não encontrada' });
      }

      res.json(entradaAtualizada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar entrada' });
    }
  },

  // Deletar entrada
  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entradaDeletada = await db
        .delete(entradas)
        .where(eq(entradas.id, Number(id)))
        .returning();

      if (!entradaDeletada.length) {
        return res.status(404).json({ erro: 'Entrada não encontrada' });
      }

      res.json({ mensagem: 'Entrada deletada com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao deletar entrada' });
    }
  }
}; 