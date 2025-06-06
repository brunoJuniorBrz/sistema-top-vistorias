import { Request, Response } from 'express';
import { db } from '../db';
import { entradasEletronicas } from '../models/schema';
import { eq } from 'drizzle-orm';

export const entradasEletronicasController = {
  async listar(req: Request, res: Response) {
    try {
      const todasEntradas = await db.select().from(entradasEletronicas);
      res.json(todasEntradas);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao listar entradas eletrônicas' });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entrada = await db.select().from(entradasEletronicas).where(eq(entradasEletronicas.id, Number(id)));
      
      if (!entrada.length) {
        return res.status(404).json({ erro: 'Entrada eletrônica não encontrada' });
      }

      res.json(entrada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar entrada eletrônica' });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const novaEntrada = await db.insert(entradasEletronicas).values(req.body).returning();
      res.status(201).json(novaEntrada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar entrada eletrônica' });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entradaAtualizada = await db
        .update(entradasEletronicas)
        .set(req.body)
        .where(eq(entradasEletronicas.id, Number(id)))
        .returning();

      if (!entradaAtualizada.length) {
        return res.status(404).json({ erro: 'Entrada eletrônica não encontrada' });
      }

      res.json(entradaAtualizada[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar entrada eletrônica' });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const entradaDeletada = await db
        .delete(entradasEletronicas)
        .where(eq(entradasEletronicas.id, Number(id)))
        .returning();

      if (!entradaDeletada.length) {
        return res.status(404).json({ erro: 'Entrada eletrônica não encontrada' });
      }

      res.json({ mensagem: 'Entrada eletrônica deletada com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao deletar entrada eletrônica' });
    }
  }
}; 