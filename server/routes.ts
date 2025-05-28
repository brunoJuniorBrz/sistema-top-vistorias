import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertProductSchema, insertTransactionSchema, insertTransactionItemSchema, SaleRequest } from "@shared/schema";
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

  const httpServer = createServer(app);
  return httpServer;
}
