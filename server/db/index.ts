import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import * as schema from '../models/schema';

// Configuração do pool de conexões
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Criação da instância do Drizzle
export const db = drizzle(pool, { schema });

// Função para testar a conexão
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('Conexão com o banco de dados estabelecida com sucesso!');
    client.release();
    return true;
  } catch (error) {
    console.error('Erro ao conectar com o banco de dados:', error);
    return false;
  }
} 