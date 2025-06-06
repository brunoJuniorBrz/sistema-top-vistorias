import { Router } from 'express';
import { entradasController } from '../controllers/entradasController';
import { entradasEletronicasController } from '../controllers/entradasEletronicasController';
import { aReceberController } from '../controllers/aReceberController';
import { saidasController } from '../controllers/saidasController';
import { saidasOperacionaisController } from '../controllers/saidasOperacionaisController';
import { fechamentosController } from '../controllers/fechamentosController';
import { authMiddleware } from '../middlewares/auth';

const router = Router();

// Rotas de Entradas
router.get('/entradas', authMiddleware, entradasController.listar);
router.get('/entradas/:id', authMiddleware, entradasController.buscar);
router.post('/entradas', authMiddleware, entradasController.criar);
router.put('/entradas/:id', authMiddleware, entradasController.atualizar);
router.delete('/entradas/:id', authMiddleware, entradasController.deletar);

// Rotas de Entradas Eletrônicas
router.get('/entradas-eletronicas', authMiddleware, entradasEletronicasController.listar);
router.get('/entradas-eletronicas/:id', authMiddleware, entradasEletronicasController.buscar);
router.post('/entradas-eletronicas', authMiddleware, entradasEletronicasController.criar);
router.put('/entradas-eletronicas/:id', authMiddleware, entradasEletronicasController.atualizar);
router.delete('/entradas-eletronicas/:id', authMiddleware, entradasEletronicasController.deletar);

// Rotas de A Receber
router.get('/a-receber', authMiddleware, aReceberController.listar);
router.get('/a-receber/:id', authMiddleware, aReceberController.buscar);
router.post('/a-receber', authMiddleware, aReceberController.criar);
router.put('/a-receber/:id', authMiddleware, aReceberController.atualizar);
router.delete('/a-receber/:id', authMiddleware, aReceberController.deletar);
router.patch('/a-receber/:id/pago', authMiddleware, aReceberController.marcarComoPago);

// Rotas de Saídas
router.get('/saidas', authMiddleware, saidasController.listar);
router.get('/saidas/:id', authMiddleware, saidasController.buscar);
router.post('/saidas', authMiddleware, saidasController.criar);
router.put('/saidas/:id', authMiddleware, saidasController.atualizar);
router.delete('/saidas/:id', authMiddleware, saidasController.deletar);

// Rotas de Saídas Operacionais
router.get('/saidas-operacionais', authMiddleware, saidasOperacionaisController.listar);
router.get('/saidas-operacionais/:id', authMiddleware, saidasOperacionaisController.buscar);
router.post('/saidas-operacionais', authMiddleware, saidasOperacionaisController.criar);
router.put('/saidas-operacionais/:id', authMiddleware, saidasOperacionaisController.atualizar);
router.delete('/saidas-operacionais/:id', authMiddleware, saidasOperacionaisController.deletar);
router.patch('/saidas-operacionais/:id/pagamento', authMiddleware, saidasOperacionaisController.registrarPagamento);

// Rotas de Fechamentos
router.get('/fechamentos', authMiddleware, fechamentosController.listar);
router.get('/fechamentos/:id', authMiddleware, fechamentosController.buscar);
router.post('/fechamentos', authMiddleware, fechamentosController.criar);
router.put('/fechamentos/:id', authMiddleware, fechamentosController.atualizar);
router.delete('/fechamentos/:id', authMiddleware, fechamentosController.deletar);

export default router; 