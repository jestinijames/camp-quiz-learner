/**
 * Clean up abandoned quiz sessions
 * Run this to remove unsubmitted sessions that are blocking users
 * 
 * Usage: node --import tsx scripts/cleanup-abandoned-sessions.ts
 * or just run with bash terminal: node scripts/cleanup-abandoned-sessions.mjs
 */

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function cleanupAbandonedSessions() {
  try {
    console.log('🔍 Finding abandoned quiz sessions...');
    
    const abandonedSessions = await prisma.quizSession.findMany({
      where: {
        isSubmitted: false
      },
      include: {
        member: {
          select: { name: true }
        },
        quiz: {
          select: { title: true }
        }
      }
    });

    console.log(`📊 Found ${abandonedSessions.length} abandoned sessions\n`);

    if (abandonedSessions.length === 0) {
      console.log('✅ No abandoned sessions to clean up!');
      return;
    }

    // Show what will be deleted
    console.log('Sessions to be deleted:');
    abandonedSessions.forEach(session => {
      console.log(`  - ${session.member.name}: ${session.quiz.title} (started ${session.startTime.toLocaleString()})`);
    });

    console.log('\n🗑️  Deleting abandoned sessions...');
    
    const result = await prisma.quizSession.deleteMany({
      where: {
        isSubmitted: false
      }
    });

    console.log(`✅ Deleted ${result.count} abandoned sessions`);
    console.log('🎉 Cleanup complete! Affected users can now retake their quizzes.');

  } catch (error) {
    console.error('❌ Error cleaning up sessions:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupAbandonedSessions();
