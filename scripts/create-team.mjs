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

async function createTeam() {
  try {
    const hashedPassword = await bcrypt.hash('team123', 10);
    
    const team = await prisma.team.create({
      data: {
        name: 'TestTeam',
        password: hashedPassword
      }
    });

    console.log('Team created successfully:', team.name);
  } catch (error) {
    console.error('Error creating team:', error);
  } finally {
    await prisma.$disconnect();
    await pool.end();
  }
}

createTeam();