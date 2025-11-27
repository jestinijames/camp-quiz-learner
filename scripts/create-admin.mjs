import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const connectionString = process.env.DATABASE_URL;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function createAdmin() {
  try {
    const hashedPassword = await bcrypt.hash('jestadmin123', 10);
    
    const admin = await prisma.admin.create({
      data: {
        username: 'jestadmin',
        password: hashedPassword
      }
    });

    console.log('Admin created successfully:', admin.username);
  } catch (error) {
    console.error('Error creating admin:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createAdmin();