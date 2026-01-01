
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';

const connectionString = process.env.DATABASE_URL!;
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  // Truncate only tables related to teams, members, and game data
  // Keep BibleVersion, BibleBook, BibleChapter, BibleVerse
  await prisma.$executeRawUnsafe(`
    TRUNCATE TABLE 
      "QuizSession", "Answer", "QuestionUsage", "TriviaItem", "TriviaView", 
      "WordleAttempt", "WordleInstance", "EmojiAttempt", "EmojiGame", 
      "Team", "Member", "Admin" 
    RESTART IDENTITY CASCADE;
  `);
  console.log('Non-bible tables truncated. Bible data preserved.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
