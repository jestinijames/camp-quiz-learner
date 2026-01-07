import prisma from '../lib/prisma';

async function checkCollaborationCards() {
  try {
    // Get all collaboration wall sessions
    const sessions = await prisma.collaborationWallSession.findMany({
      select: {
        id: true,
        title: true,
        _count: {
          select: {
            cards: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    console.log('\n=== Collaboration Wall Sessions ===\n');
    
    for (const session of sessions) {
      console.log(`Session #${session.id}: ${session.title}`);
      console.log(`Total cards: ${session._count.cards}\n`);

      // Get cards by team for this session
      const cardsWithTeam = await prisma.collaborationCard.findMany({
        where: {
          wallSessionId: session.id,
          content: {
            not: '__LISTENING_COMPLETION__'
          }
        },
        include: {
          author: {
            select: {
              firstName: true,
              lastName: true,
              team: {
                select: {
                  id: true,
                  name: true
                }
              }
            }
          }
        }
      });

      // Group by team
      const cardsByTeam = cardsWithTeam.reduce((acc, card) => {
        const teamName = card.author.team?.name || 'No Team';
        if (!acc[teamName]) {
          acc[teamName] = [];
        }
        acc[teamName].push(card);
        return acc;
      }, {} as Record<string, typeof cardsWithTeam>);

      console.log('  Cards by team:');
      for (const [teamName, teamCards] of Object.entries(cardsByTeam)) {
        console.log(`    ${teamName}: ${teamCards.length} cards`);
        // Show first few authors
        const authors = teamCards.map(c => `${c.author.firstName} ${c.author.lastName}`).slice(0, 5);
        console.log(`      Authors: ${authors.join(', ')}${teamCards.length > 5 ? '...' : ''}`);
      }
      console.log('');
    }

    // Check for any marker cards
    const markerCards = await prisma.collaborationCard.count({
      where: {
        content: '__LISTENING_COMPLETION__'
      }
    });
    
    if (markerCards > 0) {
      console.log(`\n⚠️  Found ${markerCards} listening completion marker cards (these are filtered out from display)\n`);
    }

  } catch (error) {
    console.error('Error checking collaboration cards:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkCollaborationCards();
