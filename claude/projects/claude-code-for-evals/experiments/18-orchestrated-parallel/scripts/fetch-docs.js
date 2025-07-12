#!/usr/bin/env node

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Initialize Prisma client
const prisma = new PrismaClient();

const docIds = [
  'ya8-sNiNvmhnwCXc',
  '7GuCcI-olkWYqyDA', 
  'JcM4O45bdrPM7qJr'
];

async function fetchDocuments() {
  try {
    for (let i = 0; i < docIds.length; i++) {
      const docId = docIds[i];
      
      // Fetch document with its latest version
      const document = await prisma.document.findUnique({
        where: { id: docId },
        include: {
          versions: {
            orderBy: { version: 'desc' },
            take: 1
          }
        }
      });
      
      if (!document || !document.versions.length) {
        console.error(`Document ${docId} not found`);
        continue;
      }
      
      const version = document.versions[0];
      const content = version.content || '';
      
      // Save to file
      const filename = `doc${i + 1}.md`;
      const filepath = path.join(__dirname, filename);
      
      // Add metadata header
      const fullContent = `# ${version.title}

Author: ${version.authors.join(', ') || 'Unknown'}
URL: ${version.importUrl || version.urls.join(', ') || 'N/A'}
Date: ${document.publishedDate || version.createdAt}

---

${content}`;
      
      fs.writeFileSync(filepath, fullContent);
      console.log(`✅ Saved ${filename} - ${version.title}`);
    }
  } catch (error) {
    console.error('Error fetching documents:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fetchDocuments();