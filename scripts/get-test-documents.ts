#!/usr/bin/env tsx
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getTestDocuments() {
  console.log('🔍 Finding suitable test documents...\n');
  
  // Find documents that have been evaluated by epistemic agents
  const documents = await prisma.document.findMany({
    where: {
      evaluations: {
        some: {
          versions: {
            some: {
              agentVersion: {
                agent: {
                  OR: [
                    { submittedById: 'cmce9xgoz0000l50426vul9ld' }, // Ozzie's user ID
                    { versions: { some: { name: { contains: 'Epistemic' } } } }
                  ]
                }
              }
            }
          }
        }
      }
    },
    take: 10,
    include: {
      versions: {
        orderBy: { version: 'desc' },
        take: 1,
        select: {
          title: true,
          authors: true,
          content: true
        }
      }
    }
  });

  if (documents.length === 0) {
    console.log('No documents found with epistemic evaluations.');
    console.log('Let\'s find any documents for testing:\n');
    
    const anyDocuments = await prisma.document.findMany({
      take: 5,
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1,
          select: {
            title: true,
            authors: true
          }
        }
      }
    });
    
    anyDocuments.forEach(doc => {
      const version = doc.versions[0];
      console.log(`ID: ${doc.id}`);
      console.log(`Title: ${version?.title || 'No title'}`);
      console.log(`Authors: ${version?.authors?.join(', ') || 'No authors'}`);
      console.log('---');
    });
    
    return;
  }

  console.log(`Found ${documents.length} documents with epistemic evaluations:\n`);
  
  documents.forEach(doc => {
    const version = doc.versions[0];
    console.log(`ID: ${doc.id}`);
    console.log(`Title: ${version?.title || 'No title'}`);
    console.log(`Authors: ${version?.authors?.join(', ') || 'No authors'}`);
    console.log(`Content length: ${version?.content?.length || 0} chars`);
    console.log('---');
  });

  console.log('\nRecommended test document IDs:');
  console.log(JSON.stringify(documents.slice(0, 3).map(d => d.id), null, 2));
}

getTestDocuments()
  .catch(console.error)
  .finally(() => prisma.$disconnect());