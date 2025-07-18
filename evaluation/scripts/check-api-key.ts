import { prisma } from '../../src/lib/prisma';
import crypto from 'crypto';

async function checkApiKey() {
  const targetKey = 'rmp_15a040c5450c50b7cb430ca28fbebeb18151820c6a9d71a9b9f4bce7651ccb67';
  
  // Hash the provided API key
  const hashedKey = crypto
    .createHash('sha256')
    .update(targetKey)
    .digest('hex');
  
  console.log('Looking for API key:', targetKey);
  console.log('Hashed version:', hashedKey);
  console.log('\n');
  
  try {
    // First, let's see all API keys in the database
    const allApiKeys = await prisma.apiKey.findMany({
      select: {
        id: true,
        name: true,
        key: true,
        userId: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
        user: {
          select: {
            email: true,
            name: true
          }
        }
      }
    });
    
    console.log(`Found ${allApiKeys.length} API keys in the database:\n`);
    
    let foundMatch = false;
    
    for (const apiKey of allApiKeys) {
      console.log(`ID: ${apiKey.id}`);
      console.log(`Name: ${apiKey.name}`);
      console.log(`User: ${apiKey.user.email} (${apiKey.user.name || 'No name'})`);
      console.log(`Created: ${apiKey.createdAt.toISOString()}`);
      console.log(`Last used: ${apiKey.lastUsedAt ? apiKey.lastUsedAt.toISOString() : 'Never'}`);
      console.log(`Stored key (hashed): ${apiKey.key}`);
      console.log(`Expires at: ${apiKey.expiresAt ? apiKey.expiresAt.toISOString() : 'Never'}`);
      
      if (apiKey.key === hashedKey) {
        console.log('✅ THIS MATCHES THE PROVIDED API KEY!');
        foundMatch = true;
      }
      
      console.log('---');
    }
    
    if (!foundMatch) {
      console.log('\n❌ The provided API key was not found in the database.');
    }
    
  } catch (error) {
    console.error('Error checking API keys:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkApiKey().catch(console.error);