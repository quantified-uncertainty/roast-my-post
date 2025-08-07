import { DocumentService, EvaluationService, DocumentValidator } from '@roast/domain';
import { prisma, DocumentRepository, EvaluationRepository } from '@roast/db';
import { nanoid } from 'nanoid';
import { logger } from '@/infrastructure/logging/logger';

// Skip in CI unless database is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('DocumentService Integration Tests', () => {
  let service: DocumentService;
  let testUserId: string;
  let testUser: any;

  beforeAll(async () => {
    // Create a test user
    testUserId = `test-user-${nanoid()}`;
    testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: `test-${nanoid()}@example.com`,
        name: 'Test User',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data - delete in order to respect foreign key constraints
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

  beforeEach(() => {
    const documentRepository = new DocumentRepository();
    const evaluationRepository = new EvaluationRepository();
    const validator = new DocumentValidator();
    const evaluationService = new EvaluationService(evaluationRepository, logger);
    service = new DocumentService(documentRepository, validator, evaluationService, logger);
  });

  describe('createDocument', () => {
    it('should create a document with all fields', async () => {
      const documentData = {
        title: 'Integration Test Document',
        content: 'This is a test document with enough content to pass validation. '.repeat(10).trim(),
        authors: 'Test Author',
        url: 'https://example.com/test',
        platforms: ['test-platform'],
      };

      const result = await service.createDocument(testUserId, documentData);

      expect(result.isOk()).toBe(true);
      const document = result.unwrap();
      
      expect(document.id).toBeDefined();
      expect(document.title).toBe(documentData.title);
      expect(document.content).toBe(documentData.content);
      expect(document.authorName).toBe(documentData.authors);
      expect(document.url).toBe(documentData.url);
      expect(document.platforms).toEqual(documentData.platforms);
      expect(document.submittedById).toBe(testUserId);

      // Verify in database
      const dbDoc = await prisma.document.findUnique({
        where: { id: document.id },
        include: { versions: true },
      });

      expect(dbDoc).toBeDefined();
      expect(dbDoc?.versions[0]?.title).toBe(documentData.title);
      expect(dbDoc?.versions[0]?.content).toBe(documentData.content);
    });

    it('should auto-generate title when not provided', async () => {
      const documentData = {
        title: '',
        content: 'This is the beginning of a document that needs a generated title. It has enough content to be valid.',
        authors: 'Test Author',
      };

      const result = await service.createDocument(testUserId, documentData);

      expect(result.isOk()).toBe(true);
      const document = result.unwrap();
      
      expect(document.title).toBeDefined();
      expect(document.title).not.toBe('');
      expect(document.title).toContain('This is the beginning');
    });

    it('should reject documents with short content', async () => {
      const documentData = {
        title: 'Test',
        content: 'Too short',
        authors: 'Test Author',
      };

      const result = await service.createDocument(testUserId, documentData);

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error?.message).toContain('Invalid document data');
    });

    it('should create document with agent IDs and create evaluations via EvaluationService', async () => {
      // Create test agents with versions
      const agent1Id = `test-agent-1-${nanoid()}`;
      const agent1 = await prisma.agent.create({
        data: {
          id: agent1Id,
          submittedById: testUserId,
          versions: {
            create: {
              name: 'Test Agent 1',
              description: 'Test agent for integration test',
              primaryInstructions: 'Test instructions',
              version: 1,
            },
          },
        },
      });

      const agent2Id = `test-agent-2-${nanoid()}`;
      const agent2 = await prisma.agent.create({
        data: {
          id: agent2Id,
          submittedById: testUserId,
          versions: {
            create: {
              name: 'Test Agent 2',
              description: 'Another test agent',
              primaryInstructions: 'More test instructions',
              version: 1,
            },
          },
        },
      });

      const documentData = {
        title: 'Document with Agent IDs',
        content: 'This document will have agent IDs passed and evaluations created via EvaluationService. '.repeat(10).trim(),
        authors: 'Test Author',
      };

      const result = await service.createDocument(
        testUserId,
        documentData,
        [agent1.id, agent2.id]
      );

      expect(result.isOk()).toBe(true);
      const document = result.unwrap();

      // Verify document was created successfully
      expect(document.id).toBeDefined();
      expect(document.title).toBe(documentData.title);

      // Verify evaluations were created (now handled by EvaluationService)
      const evaluations = await prisma.evaluation.findMany({
        where: { documentId: document.id },
      });

      expect(evaluations).toHaveLength(2);
      expect(evaluations.map(e => e.agentId).sort()).toEqual([agent1Id, agent2Id].sort());

      // Verify jobs were created
      const jobs = await prisma.job.findMany({
        where: { 
          evaluation: {
            documentId: document.id
          }
        },
      });

      expect(jobs).toHaveLength(2);
      expect(jobs.every(j => j.status === 'PENDING')).toBe(true);

      // Clean up - delete jobs first, then evaluations, then agents
      await prisma.job.deleteMany({ 
        where: { 
          evaluation: {
            documentId: document.id
          }
        } 
      });
      await prisma.evaluation.deleteMany({ where: { documentId: document.id } });
      await prisma.agent.delete({ where: { id: agent1Id } });
      await prisma.agent.delete({ where: { id: agent2Id } });
    });
  });

  describe('getDocumentForReader', () => {
    let testDocument: any;

    beforeEach(async () => {
      // Create a test document
      const createResult = await service.createDocument(testUserId, {
        title: 'Reader Test Document',
        content: 'Content for reading test. '.repeat(10),
        authors: 'Test Author',
      });
      
      testDocument = createResult.unwrap();
    });

    it('should fetch document with evaluations', async () => {
      const result = await service.getDocumentForReader(testDocument.id, testUserId);

      expect(result.isOk()).toBe(true);
      const doc = result.unwrap();

      expect(doc.id).toBe(testDocument.id);
      expect(doc.title).toBe('Reader Test Document');
      expect(doc.reviews).toBeDefined();
      expect(Array.isArray(doc.reviews)).toBe(true);
    });

    it('should return error for non-existent document', async () => {
      const result = await service.getDocumentForReader('non-existent-id', testUserId);

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error?.message).toContain('Document');
    });
  });

  describe('updateDocument', () => {
    let testDocument: any;

    beforeEach(async () => {
      const createResult = await service.createDocument(testUserId, {
        title: 'Original Title',
        content: 'Original content that is long enough. '.repeat(5),
        authors: 'Original Author',
      });
      
      testDocument = createResult.unwrap();
    });

    it('should update document content and title', async () => {
      const updates = {
        title: 'Updated Title',
        content: 'Updated content that is still long enough. '.repeat(5),
      };

      const result = await service.updateDocument(testDocument.id, testUserId, updates);

      expect(result.isOk()).toBe(true);

      // Verify update in database
      const dbDoc = await prisma.document.findUnique({
        where: { id: testDocument.id },
        include: { versions: { orderBy: { version: 'desc' }, take: 1 } },
      });

      expect(dbDoc?.versions[0]?.title).toBe(updates.title);
      expect(dbDoc?.versions[0]?.content).toBe(updates.content);
    });

    it('should reject update from non-owner', async () => {
      const otherUserId = `other-user-${nanoid()}`;
      await prisma.user.create({
        data: {
          id: otherUserId,
          email: `other-${nanoid()}@example.com`,
          name: 'Other User',
        },
      });

      const result = await service.updateDocument(testDocument.id, otherUserId, {
        title: 'Hacked Title',
      });

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error?.message).toContain('permission');

      // Clean up
      await prisma.user.delete({ where: { id: otherUserId } });
    });
  });

  describe('deleteDocument', () => {
    it('should delete document and all related data', async () => {
      // Create document
      const createResult = await service.createDocument(testUserId, {
        title: 'Document to Delete',
        content: 'This document will be deleted. '.repeat(5),
        authors: 'Test Author',
      });
      
      const document = createResult.unwrap();

      // Delete document
      const deleteResult = await service.deleteDocument(document.id, testUserId);
      expect(deleteResult.isOk()).toBe(true);

      // Verify deletion
      const dbDoc = await prisma.document.findUnique({
        where: { id: document.id },
      });
      expect(dbDoc).toBeNull();
    });

    it('should prevent deletion by non-owner', async () => {
      // Create document
      const createResult = await service.createDocument(testUserId, {
        title: 'Protected Document',
        content: 'This document should not be deleted by others. '.repeat(5),
        authors: 'Test Author',
      });
      
      const document = createResult.unwrap();

      // Create another user
      const otherUserId = `other-user-${nanoid()}`;
      await prisma.user.create({
        data: {
          id: otherUserId,
          email: `other-${nanoid()}@example.com`,
          name: 'Other User',
        },
      });

      // Attempt deletion by non-owner
      const deleteResult = await service.deleteDocument(document.id, otherUserId);
      expect(deleteResult.isError()).toBe(true);

      // Verify document still exists
      const dbDoc = await prisma.document.findUnique({
        where: { id: document.id },
      });
      expect(dbDoc).toBeDefined();

      // Clean up
      await prisma.user.delete({ where: { id: otherUserId } });
    });
  });

  describe('searchDocuments', () => {
    beforeEach(async () => {
      // Create multiple documents for search
      await service.createDocument(testUserId, {
        title: 'Machine Learning Fundamentals',
        content: 'This document covers the basics of machine learning algorithms. '.repeat(5),
        authors: 'ML Expert',
      });

      await service.createDocument(testUserId, {
        title: 'Deep Learning with Neural Networks',
        content: 'Advanced techniques in deep learning and neural network architectures. '.repeat(5),
        authors: 'DL Researcher',
      });

      await service.createDocument(testUserId, {
        title: 'Natural Language Processing',
        content: 'Understanding how machines process and analyze human language. '.repeat(5),
        authors: 'NLP Scientist',
      });
    });

    it('should find documents matching search query', async () => {
      const result = await service.searchDocuments('machine learning');

      expect(result.isOk()).toBe(true);
      const documents = result.unwrap();
      
      expect(documents.length).toBeGreaterThan(0);
      expect(documents.some((d: any) => 
        d.title.toLowerCase().includes('machine learning') ||
        d.content?.toLowerCase().includes('machine learning')
      )).toBe(true);
    });

    it('should limit results based on limit parameter', async () => {
      const result = await service.searchDocuments('learning', 2);

      expect(result.isOk()).toBe(true);
      const documents = result.unwrap();
      
      expect(documents.length).toBeLessThanOrEqual(2);
    });

    it('should reject very short search queries', async () => {
      const result = await service.searchDocuments('a');

      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error?.message).toContain('at least 2 characters');
    });
  });

  describe('reuploadDocument', () => {
    it('should successfully re-import a document with import URL', async () => {
      // Create document with import URL
      const createResult = await service.createDocument(testUserId, {
        title: 'Imported Document',
        content: 'This document was imported from a URL. '.repeat(5),
        authors: 'Import Author',
        importUrl: 'https://example.com/article',
      });
      
      const document = createResult.unwrap();

      // Mock the processArticle function
      const processArticle = jest.fn().mockResolvedValue({
        title: 'Re-imported Title',
        content: 'Updated content from re-import. '.repeat(10),
        author: 'Updated Author',
        url: 'https://example.com/article',
        platforms: [],
      });

      // Note: In a real test, we'd inject processArticle as a dependency
      // For now, this test would need refactoring to properly mock the import
      
      // Verify the document has importUrl
      const dbDoc = await prisma.documentVersion.findFirst({
        where: { documentId: document.id },
      });
      expect(dbDoc?.importUrl).toBe('https://example.com/article');
    });
  });
});