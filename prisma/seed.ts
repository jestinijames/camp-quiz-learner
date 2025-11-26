import pkg from '@prisma/client';
const { PrismaClient } = pkg;

const prisma = new PrismaClient();

async function main() {
  const teams = ['Team A', 'Team B', 'Team C', 'Team D', 'Team E', 'Team F'];
  
  for (const teamName of teams) {
    const team = await prisma.team.create({
      data: {
        name: teamName,
        password: 'hashed_default_password', // hash properly in real app
        members: {
          create: [{ name: 'Member 1' }, { name: 'Member 2' }]
        }
      }
    });
    console.log(`Created ${team.name} with members`);
  }
}

main()
  .catch(e => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
