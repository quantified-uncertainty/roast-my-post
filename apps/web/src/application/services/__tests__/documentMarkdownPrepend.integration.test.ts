import { DocumentService, EvaluationService, DocumentValidator } from '@roast/domain';
import { prisma, DocumentRepository, EvaluationRepository } from '@roast/db';
import { generateId } from '@roast/db';
import { logger } from '@/infrastructure/logging/logger';
import { importDocumentService } from '../documentImport';

// Skip in CI unless database is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Document markdownPrepend Integration Tests', () => {
  let documentService: DocumentService;
  let testUserId: string;
  let testUser: any;

  beforeAll(async () => {
    // Create a test user
    testUserId = `test-user-${generateId()}`;
    testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${generateId()}@example.com`,
        name: 'Test User',
      },
    });

    // Initialize DocumentService
    const docRepo = new DocumentRepository(prisma);
    const evalRepo = new EvaluationRepository(prisma);
    const validator = new DocumentValidator();
    const evalService = new EvaluationService(evalRepo, logger);
    documentService = new DocumentService(docRepo, validator, evalService, logger);
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.job.deleteMany({
      where: { 
        evaluation: { 
          document: { 
            submittedById: testUserId 
          } 
        } 
      }
    });
    
    await prisma.evaluation.deleteMany({
      where: {
        document: {
          submittedById: testUserId
        }
      }
    });
    
    await prisma.document.deleteMany({
      where: { submittedById: testUserId },
    });
    
    await prisma.user.delete({
      where: { id: testUserId },
    });
    
    await prisma.$disconnect();
  });

  describe('markdownPrepend generation', () => {
    it('should generate markdownPrepend when creating a document via DocumentService', async () => {
      // Create a document via DocumentService
      const result = await documentService.createDocument(
        testUserId,
        {
          title: 'Test Document with Prepend',
          content: 'This is the main content of the document. It should have a markdown prepend header generated automatically.',
          authors: 'Test Author',
          platforms: ['Test Platform', 'Another Platform'],
          publishedDate: new Date('2024-01-15'),
        }
      );

      expect(result.isOk()).toBe(true);
      const document = result.unwrap();

      // Fetch the document version from the database to check markdownPrepend
      const docVersion = await prisma.documentVersion.findFirst({
        where: { documentId: document.id },
        orderBy: { version: 'desc' }
      });

      expect(docVersion).toBeDefined();
      expect(docVersion?.markdownPrepend).toBeDefined();
      expect(docVersion?.markdownPrepend).not.toBeNull();
      
      // Check that markdownPrepend contains expected content
      const prepend = docVersion!.markdownPrepend!;
      expect(prepend).toContain('# Test Document with Prepend');
      expect(prepend).toContain('**Author:** Test Author');
      expect(prepend).toContain('**Publication:** Test Platform, Another Platform');
      // Date might vary due to timezone, just check it has a date
      expect(prepend).toMatch(/\*\*Date Published:\*\* \w+ \d+, 2024/);
      expect(prepend).toContain('---');
    });

    it('should generate markdownPrepend when creating a document without publishedDate', async () => {
      // Create a document without a publishedDate (make content long enough to pass validation)
      const result = await documentService.createDocument(
        testUserId,
        {
          title: 'Document Without Date',
          content: 'This document has no explicit published date. We need to make this content longer to pass the minimum content length validation. Adding more text here to ensure the document meets the requirements.',
          authors: 'Anonymous Author',
          platforms: ['Blog'],
        }
      );

      expect(result.isOk()).toBe(true);
      const document = result.unwrap();

      // Fetch the document version from the database
      const docVersion = await prisma.documentVersion.findFirst({
        where: { documentId: document.id },
        orderBy: { version: 'desc' }
      });

      expect(docVersion?.markdownPrepend).toBeDefined();
      expect(docVersion?.markdownPrepend).not.toBeNull();
      
      // Check that markdownPrepend handles missing date correctly
      const prepend = docVersion!.markdownPrepend!;
      expect(prepend).toContain('# Document Without Date');
      expect(prepend).toContain('**Author:** Anonymous Author');
      expect(prepend).toContain('**Publication:** Blog');
      expect(prepend).toContain('**Date Published:** Unknown');
    });

    it('should store markdownPrepend separately from content', async () => {
      // Create a document
      const result = await documentService.createDocument(
        testUserId,
        {
          title: 'Test Content Integration',
          content: 'Main content here. This needs to be at least 100 characters long to pass validation. Adding more text to meet the minimum requirements for document content.',
          authors: 'Test Author',
          platforms: ['Platform'],
        }
      );

      expect(result.isOk()).toBe(true);
      const document = result.unwrap();

      // Fetch the document version from database to verify prepend is stored
      const docVersion = await prisma.documentVersion.findFirst({
        where: { documentId: document.id },
        orderBy: { version: 'desc' }
      });
      
      expect(docVersion).toBeDefined();
      expect(docVersion?.markdownPrepend).toBeDefined();
      expect(docVersion?.markdownPrepend).toContain('# Test Content Integration');
      expect(docVersion?.markdownPrepend).toContain('**Author:** Test Author');
      
      // Verify content is stored separately without prepend
      expect(docVersion?.content).toContain('Main content here. This needs to be at least');
      expect(docVersion?.content).not.toContain('# Test Content Integration');
    });

    describe('Document import via URL', () => {
      it('should generate markdownPrepend when importing a document via URL', async () => {
        // Mock the import service to return predictable data
        // Since we can't actually fetch from a URL in tests, we'll directly use DocumentService
        // with importUrl set to simulate an import
        const result = await documentService.createDocument(
          testUserId,
          {
            title: 'Imported Article',
            content: 'This is content imported from an external URL. The content needs to be at least 100 characters long to pass validation requirements. Adding more text here.',
            authors: 'External Author',
            platforms: ['Medium'],
            importUrl: 'https://example.com/article',
            publishedDate: new Date('2024-03-20'),
          }
        );

        expect(result.isOk()).toBe(true);
        const document = result.unwrap();

        // Fetch the document version from the database
        const docVersion = await prisma.documentVersion.findFirst({
          where: { documentId: document.id },
          orderBy: { version: 'desc' }
        });

        expect(docVersion).toBeDefined();
        expect(docVersion?.importUrl).toBe('https://example.com/article');
        expect(docVersion?.markdownPrepend).toBeDefined();
        expect(docVersion?.markdownPrepend).not.toBeNull();
        
        // Check that imported documents also get proper markdownPrepend
        const prepend = docVersion!.markdownPrepend!;
        expect(prepend).toContain('# Imported Article');
        expect(prepend).toContain('**Author:** External Author');
        expect(prepend).toContain('**Publication:** Medium');
        // Date might vary due to timezone
        expect(prepend).toMatch(/\*\*Date Published:\*\* \w+ \d+, 2024/);
      });
    });

    describe('Direct markdown document creation', () => {
      it('should generate markdownPrepend for documents created with markdown content', async () => {
        const markdownContent = `## Introduction

This is a markdown document with headers, **bold text**, and *italics*.

### Section 1
- Bullet point 1
- Bullet point 2

### Section 2
Some more content here.`;

        const result = await documentService.createDocument(
          testUserId,
          {
            title: 'Markdown Document',
            content: markdownContent,
            authors: 'Markdown Author',
            platforms: ['GitHub', 'GitLab'],
            publishedDate: new Date('2024-06-15'),
          }
        );

        expect(result.isOk()).toBe(true);
        const document = result.unwrap();

        // Fetch the document version from the database
        const docVersion = await prisma.documentVersion.findFirst({
          where: { documentId: document.id },
          orderBy: { version: 'desc' }
        });

        expect(docVersion?.markdownPrepend).toBeDefined();
        expect(docVersion?.markdownPrepend).not.toBeNull();
        
        // Verify markdownPrepend is generated for markdown content
        const prepend = docVersion!.markdownPrepend!;
        expect(prepend).toContain('# Markdown Document');
        expect(prepend).toContain('**Author:** Markdown Author');
        expect(prepend).toContain('**Publication:** GitHub, GitLab');
        // Date might vary due to timezone
        expect(prepend).toMatch(/\*\*Date Published:\*\* \w+ \d+, 2024/);
        
        // Verify the original markdown content is preserved
        expect(docVersion?.content).toContain('## Introduction');
        expect(docVersion?.content).toContain('**bold text**');
        expect(docVersion?.content).toContain('### Section 1');
      });

      it('should properly position markdownPrepend before the document content', async () => {
        const content = '# My Article\n\nThis is the actual article content. We need to make this at least 100 characters long to pass validation. Adding more content here to meet the requirements.';
        
        const result = await documentService.createDocument(
          testUserId,
          {
            title: 'Positioning Test',
            content: content,
            authors: 'Position Author',
            platforms: ['Web'],
          }
        );

        expect(result.isOk()).toBe(true);
        const document = result.unwrap();

        // Get the document version to check positioning
        const docVersion = await prisma.documentVersion.findFirst({
          where: { documentId: document.id },
          orderBy: { version: 'desc' }
        });
        
        expect(docVersion).toBeDefined();
        
        // markdownPrepend should be separate from content
        const prepend = docVersion!.markdownPrepend!;
        const docContent = docVersion!.content;
        
        // Prepend should have the document title
        expect(prepend).toContain('# Positioning Test');
        expect(prepend).toContain('---');
        
        // Original content should be preserved as-is
        expect(docContent).toContain('# My Article');
        expect(docContent).toContain('This is the actual article content');
        
        // Prepend should NOT be in the content field
        expect(docContent).not.toContain('# Positioning Test');
        expect(docContent).not.toContain('**Author:** Position Author');
      });
    });
  });
});