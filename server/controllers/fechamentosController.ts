import { Request, Response } from 'express';
import { storage } from '../db/drizzleStorage';
import { insertFechamentoSchema } from '../schemas/fechamentos';
import { z } from 'zod';

export const fechamentosController = {
  async listar(req: Request, res: Response) {
    try {
      const { userId, lojaId, date } = req.query;
      
      if (!userId || !lojaId) {
        return res.status(400).json({ message: 'userId e lojaId são obrigatórios' });
      }

      const fechamentos = await storage.listarFechamentos({
        userId: userId as string,
        lojaId: lojaId as string,
        date: date as string
      });

      return res.json(fechamentos);
    } catch (error) {
      console.error('Erro ao listar fechamentos:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const fechamento = await storage.buscarFechamento(id);

      if (!fechamento) {
        return res.status(404).json({ message: 'Fechamento não encontrado' });
      }

      return res.json(fechamento);
    } catch (error) {
      console.error('Erro ao buscar fechamento:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const data = insertFechamentoSchema.parse(req.body);
      const fechamento = await storage.createFechamento(data);
      return res.status(201).json(fechamento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao criar fechamento:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const data = insertFechamentoSchema.partial().parse(req.body);
      const fechamento = await storage.atualizarFechamento(id, data);

      if (!fechamento) {
        return res.status(404).json({ message: 'Fechamento não encontrado' });
      }

      return res.json(fechamento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: 'Dados inválidos', errors: error.errors });
      }
      console.error('Erro ao atualizar fechamento:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const fechamento = await storage.deletarFechamento(id);

      if (!fechamento) {
        return res.status(404).json({ message: 'Fechamento não encontrado' });
      }

      return res.status(204).send();
    } catch (error) {
      console.error('Erro ao deletar fechamento:', error);
      return res.status(500).json({ message: 'Erro interno do servidor' });
    }
  }
}; 