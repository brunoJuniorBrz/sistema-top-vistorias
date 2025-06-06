import { Request, Response, NextFunction } from 'express';
import { db } from '../db';
import { usuarios } from '../models/schema';
import { eq } from 'drizzle-orm';

export const authMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({ erro: 'Token não fornecido' });
    }

    // Aqui você deve implementar a verificação do token
    // Por enquanto, vamos apenas verificar se o usuário existe
    const usuario = await db.select().from(usuarios).where(eq(usuarios.id, 1));

    if (!usuario.length) {
      return res.status(401).json({ erro: 'Usuário não autenticado' });
    }

    // Adiciona o usuário ao request para uso posterior
    req.user = usuario[0];
    next();
  } catch (error) {
    res.status(500).json({ erro: 'Erro na autenticação' });
  }
}; 