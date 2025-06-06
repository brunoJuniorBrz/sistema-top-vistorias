import { Request, Response } from 'express';
import { db } from '../db';
import { aReceber } from '../models/schema';
import { eq } from 'drizzle-orm';

export const aReceberController = {
  async listar(req: Request, res: Response) {
    try {
      const todosRegistros = await db.select().from(aReceber);
      res.json(todosRegistros);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao listar registros a receber' });
    }
  },

  async buscar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const registro = await db.select().from(aReceber).where(eq(aReceber.id, Number(id)));
      
      if (!registro.length) {
        return res.status(404).json({ erro: 'Registro não encontrado' });
      }

      res.json(registro[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao buscar registro' });
    }
  },

  async criar(req: Request, res: Response) {
    try {
      const novoRegistro = await db.insert(aReceber).values(req.body).returning();
      res.status(201).json(novoRegistro[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao criar registro' });
    }
  },

  async atualizar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const registroAtualizado = await db
        .update(aReceber)
        .set(req.body)
        .where(eq(aReceber.id, Number(id)))
        .returning();

      if (!registroAtualizado.length) {
        return res.status(404).json({ erro: 'Registro não encontrado' });
      }

      res.json(registroAtualizado[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao atualizar registro' });
    }
  },

  async deletar(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const registroDeletado = await db
        .delete(aReceber)
        .where(eq(aReceber.id, Number(id)))
        .returning();

      if (!registroDeletado.length) {
        return res.status(404).json({ erro: 'Registro não encontrado' });
      }

      res.json({ mensagem: 'Registro deletado com sucesso' });
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao deletar registro' });
    }
  },

  async marcarComoPago(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const registroAtualizado = await db
        .update(aReceber)
        .set({ pago: true })
        .where(eq(aReceber.id, Number(id)))
        .returning();

      if (!registroAtualizado.length) {
        return res.status(404).json({ erro: 'Registro não encontrado' });
      }

      res.json(registroAtualizado[0]);
    } catch (error) {
      res.status(500).json({ erro: 'Erro ao marcar como pago' });
    }
  }
}; 