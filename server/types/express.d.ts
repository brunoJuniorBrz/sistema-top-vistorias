import { Usuario } from '../models/types';

declare global {
  namespace Express {
    interface Request {
      user?: Usuario;
    }
  }
} 