import { prisma } from '@roast/db';

async function checkAuthTokens() {
  console.log('Checking verification tokens...\n');
  
  const tokens = await prisma.verificationToken.findMany({
    orderBy: { expires: 'desc' },
    take: 10
  });
  
  console.log(`Found ${tokens.length} verification tokens:`);
  tokens.forEach(token => {
    console.log(`- Email: ${token.identifier}`);
    console.log(`  Token: ${token.token.substring(0, 20)}...`);
    console.log(`  Expires: ${token.expires}`);
    console.log(`  Expired: ${token.expires < new Date() ? 'Yes' : 'No'}\n`);
  });
  
  await prisma.$disconnect();
}

checkAuthTokens().catch(console.error);