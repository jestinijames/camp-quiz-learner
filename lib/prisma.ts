// lib/prisma.ts
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
};

// Optimized pool configuration for serverless/edge environments
const poolConfig = {
  connectionString,
  max: 1, // CRITICAL: Only 1 connection per serverless function instance
  min: 0, // No minimum connections
  idleTimeoutMillis: 0, // Close idle connections immediately
  allowExitOnIdle: true, // Allow pool to close when idle
  connectionTimeoutMillis: 5000, // 5 second timeout for new connections
};

let prismaInstance: PrismaClient;

if (process.env.NODE_ENV === 'production') {
  const pool = new Pool(poolConfig);
  const adapter = new PrismaPg(pool);
  prismaInstance = new PrismaClient({ adapter });
} else {
  if (!globalForPrisma.prisma) {
    const pool = new Pool(poolConfig);
    const adapter = new PrismaPg(pool);
    globalForPrisma.prisma = new PrismaClient({ adapter });
  }
  prismaInstance = globalForPrisma.prisma
}

export const prisma = prismaInstance
export default prismaInstance
