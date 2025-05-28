import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  insertProductSchema, 
  insertTransactionSchema, 
  insertTransactionItemSchema, 
  insertUserSchema,
  insertFechamentoSchema,
  insertReceivableSchema,
  SaleRequest 
} from "@shared/schema";
import { z } from "zod";

const saleRequestSchema = z.object({
  items: z.array(z.object({
    code: z.string(),
    name: z.string(),
    price: z.number(),
    quantity: z.number()
  })),
  paymentMethod: z.string(),
  receivedAmount: z.number().optional()
});

export async function registerRoutes(app: Express): Promise<Server> {
  // Authentication Routes
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, senha } = req.body;
      
      if (!email || !senha) {
        return res.status(400).json({ error: "Email e senha são obrigatórios" });
      }

      const user = await storage.authenticateUser(email, senha);
      
      if (!user) {
        return res.status(401).json({ error: "Email ou senha incorretos" });
      }

      res.json(user);
    } catch (error) {
      console.error("Erro no login:", error);
      res.status(500).json({ error: "Erro interno do servidor" });
    }
  });

  // Products routes
  app.get("/api/products", async (req, res) => {
    try {
      const products = await storage.getProducts();
      res.json(products);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch products" });
    }
  });

  app.get("/api/products/:code", async (req, res) => {
    try {
      const product = await storage.getProductByCode(req.params.code);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch product" });
    }
  });

  app.post("/api/products", async (req, res) => {
    try {
      const productData = insertProductSchema.parse(req.body);
      const product = await storage.createProduct(productData);
      res.status(201).json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create product" });
    }
  });

  app.put("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const productData = insertProductSchema.partial().parse(req.body);
      const product = await storage.updateProduct(id, productData);
      if (!product) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid product data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteProduct(id);
      if (!deleted) {
        return res.status(404).json({ message: "Product not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete product" });
    }
  });

  // Transactions routes
  app.get("/api/transactions", async (req, res) => {
    try {
      const transactions = await storage.getTransactions();
      res.json(transactions);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transactions" });
    }
  });

  app.get("/api/transactions/:id", async (req, res) => {
    try {
      const transaction = await storage.getTransactionById(req.params.id);
      if (!transaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      res.json(transaction);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch transaction" });
    }
  });

  // Sale processing
  app.post("/api/sales", async (req, res) => {
    try {
      const saleData = saleRequestSchema.parse(req.body);
      
      // Generate transaction ID
      const transactionId = `TXN${Date.now()}`;
      
      // Calculate total
      const total = saleData.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      
      // Create transaction
      const transaction = await storage.createTransaction({
        transactionId,
        total: total.toFixed(2),
        paymentMethod: saleData.paymentMethod,
        status: "completed",
        operatorName: "João Silva"
      }, saleData.items.map(item => ({
        transactionId,
        productCode: item.code,
        productName: item.name,
        price: item.price.toFixed(2),
        quantity: item.quantity
      })));

      // Update product stocks
      for (const item of saleData.items) {
        await storage.updateProductStock(item.code, item.quantity);
      }

      res.status(201).json({ 
        success: true, 
        transaction,
        change: saleData.receivedAmount ? Math.max(0, saleData.receivedAmount - total) : 0
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid sale data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to process sale" });
    }
  });

  // Register session routes
  app.get("/api/register", async (req, res) => {
    try {
      const session = await storage.getCurrentRegisterSession();
      if (!session) {
        return res.status(404).json({ message: "No active register session" });
      }
      res.json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch register session" });
    }
  });

  app.post("/api/register/open", async (req, res) => {
    try {
      const { openingBalance, operatorName } = req.body;
      const today = new Date().toISOString().split('T')[0];
      
      const session = await storage.createRegisterSession({
        date: today,
        isOpen: true,
        openingBalance: openingBalance.toFixed(2),
        currentBalance: openingBalance.toFixed(2),
        expectedBalance: openingBalance.toFixed(2),
        operatorName: operatorName || "Sistema"
      });
      
      res.status(201).json(session);
    } catch (error) {
      res.status(500).json({ message: "Failed to open register" });
    }
  });

  app.post("/api/register/close", async (req, res) => {
    try {
      const session = await storage.getCurrentRegisterSession();
      if (!session) {
        return res.status(404).json({ message: "No active register session" });
      }
      
      const updatedSession = await storage.updateRegisterSession(session.id, {
        isOpen: false
      });
      
      res.json(updatedSession);
    } catch (error) {
      res.status(500).json({ message: "Failed to close register" });
    }
  });

  app.post("/api/register/reconcile", async (req, res) => {
    try {
      const { physicalBalance, notes } = req.body;
      const session = await storage.getCurrentRegisterSession();
      if (!session) {
        return res.status(404).json({ message: "No active register session" });
      }
      
      const expectedBalance = parseFloat(session.expectedBalance);
      const physical = parseFloat(physicalBalance);
      const difference = physical - expectedBalance;
      
      const updatedSession = await storage.updateRegisterSession(session.id, {
        physicalBalance: physicalBalance.toFixed(2),
        reconciled: true
      });
      
      res.json({ 
        session: updatedSession, 
        difference: difference.toFixed(2),
        status: Math.abs(difference) < 0.01 ? 'balanced' : difference > 0 ? 'overage' : 'shortage'
      });
    } catch (error) {
      res.status(500).json({ message: "Failed to reconcile register" });
    }
  });

  // Statistics routes
  app.get("/api/stats", async (req, res) => {
    try {
      const date = req.query.date as string;
      const stats = await storage.getDailyStats(date);
      res.json(stats);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch statistics" });
    }
  });

  // Fechamentos (Cash Closing) routes
  app.get("/api/fechamentos", async (req, res) => {
    try {
      const { userId, lojaId, date } = req.query;
      const fechamentos = await storage.getFechamentos(
        userId as string, 
        lojaId as string, 
        date as string
      );
      res.json(fechamentos);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fechamentos" });
    }
  });

  app.get("/api/fechamentos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fechamento = await storage.getFechamentoById(id);
      if (!fechamento) {
        return res.status(404).json({ message: "Fechamento not found" });
      }
      res.json(fechamento);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch fechamento" });
    }
  });

  app.post("/api/fechamentos", async (req, res) => {
    try {
      const fechamentoData = insertFechamentoSchema.parse(req.body);
      const fechamento = await storage.createFechamento(fechamentoData);
      res.status(201).json(fechamento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fechamento data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create fechamento" });
    }
  });

  app.put("/api/fechamentos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const fechamentoData = insertFechamentoSchema.partial().parse(req.body);
      const fechamento = await storage.updateFechamento(id, fechamentoData);
      if (!fechamento) {
        return res.status(404).json({ message: "Fechamento not found" });
      }
      res.json(fechamento);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid fechamento data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to update fechamento" });
    }
  });

  app.delete("/api/fechamentos/:id", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const deleted = await storage.deleteFechamento(id);
      if (!deleted) {
        return res.status(404).json({ message: "Fechamento not found" });
      }
      res.status(204).send();
    } catch (error) {
      res.status(500).json({ message: "Failed to delete fechamento" });
    }
  });

  // Users routes
  app.get("/api/users", async (req, res) => {
    try {
      const users = await storage.getUsers();
      res.json(users);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.get("/api/users/by-email/:email", async (req, res) => {
    try {
      const email = decodeURIComponent(req.params.email);
      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      res.json(user);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  app.post("/api/users", async (req, res) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      const user = await storage.createUser(userData);
      res.status(201).json(user);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid user data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Authentication route
  app.post("/api/auth/login", async (req, res) => {
    try {
      const { email, password } = req.body;
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.authenticateUser(email, password);
      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      res.json({ 
        user: {
          uid: user.uid,
          email: user.email,
          name: user.name,
          lojaId: user.lojaId,
          role: user.role
        }
      });
    } catch (error) {
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Receivables routes
  app.get("/api/receivables", async (req, res) => {
    try {
      const { fechamentoId, userId, status } = req.query;
      const receivables = await storage.getReceivables(
        fechamentoId ? parseInt(fechamentoId as string) : undefined,
        userId as string,
        status as string
      );
      res.json(receivables);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch receivables" });
    }
  });

  app.post("/api/receivables", async (req, res) => {
    try {
      const receivableData = insertReceivableSchema.parse(req.body);
      const receivable = await storage.createReceivable(receivableData);
      res.status(201).json(receivable);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid receivable data", errors: error.errors });
      }
      res.status(500).json({ message: "Failed to create receivable" });
    }
  });

  app.patch("/api/receivables/:id/status", async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      const { status, dataPagamento, dataBaixa } = req.body;
      
      const receivable = await storage.updateReceivableStatus(
        id, 
        status,
        dataPagamento ? new Date(dataPagamento) : undefined,
        dataBaixa ? new Date(dataBaixa) : undefined
      );
      
      if (!receivable) {
        return res.status(404).json({ message: "Receivable not found" });
      }
      
      res.json(receivable);
    } catch (error) {
      res.status(500).json({ message: "Failed to update receivable status" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
