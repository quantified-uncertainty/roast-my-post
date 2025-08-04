/**
 * Migration script to populate markdownPrepend for all document versions
 * that don't have it set. This ensures consistent data for the fullContent
 * computed field.
 */

import { prisma } from '@roast/db';
import { generateMarkdownPrepend } from '@roast/db/src/utils/documentMetadata';

async function migrateMarkdownPrepend() {
  console.log('🔍 Checking documents without markdownPrepend...');
  
  const documentsWithoutPrepend = await prisma.documentVersion.findMany({
    where: {
      markdownPrepend: null
    },
    select: {
      id: true,
      title: true,
      authors: true,
      platforms: true,
      publishedDate: true,
      createdAt: true
    }
  });

  console.log(`Found ${documentsWithoutPrepend.length} documents without markdownPrepend`);

  if (documentsWithoutPrepend.length === 0) {
    console.log('✅ All documents already have markdownPrepend');
    return;
  }

  console.log('📝 Generating prepends for documents...');
  
  let updated = 0;
  
  for (const doc of documentsWithoutPrepend) {
    const prepend = generateMarkdownPrepend({
      title: doc.title,
      author: doc.authors?.[0],
      platforms: doc.platforms,
      publishedDate: doc.publishedDate || doc.createdAt?.toISOString()
    });

    await prisma.documentVersion.update({
      where: { id: doc.id },
      data: { markdownPrepend: prepend }
    });

    updated++;
    console.log(`✅ Updated document: ${doc.title} (${updated}/${documentsWithoutPrepend.length})`);
  }

  console.log(`🎉 Successfully migrated ${updated} documents`);
}

// Run the migration
migrateMarkdownPrepend()
  .catch((error) => {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });