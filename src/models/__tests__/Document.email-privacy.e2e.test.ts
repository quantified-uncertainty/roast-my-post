import { prisma } from '@/lib/prisma';
import { DocumentModel } from '../Document';
import { nanoid } from 'nanoid';

describe('DocumentModel Integration Tests - Email Privacy', () => {
  let testUser: any;
  let testDocument: any;

  beforeAll(async () => {
    // Create test user with email
    testUser = await prisma.user.create({
      data: {
        email: 'document-submitter@test.com',
        name: 'Document Submitter',
      },
    });

    // Create test document
    const docId = nanoid();
    testDocument = await prisma.document.create({
      data: {
        id: docId,
        publishedDate: new Date(),
        submittedById: testUser.id,
        versions: {
          create: {
            version: 1,
            title: 'Test Document for Email Privacy',
            authors: ['Test Author'],
            urls: ['https://example.com'],
            platforms: ['test'],
            intendedAgents: [],
            content: 'This is test content',
          },
        },
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.document.delete({
      where: { id: testDocument.id },
    });
    await prisma.user.delete({
      where: { id: testUser.id },
    });
    await prisma.$disconnect();
  });

  describe('getDocumentWithEvaluations', () => {
    it('should not expose submittedBy user email', async () => {
      const document = await DocumentModel.getDocumentWithEvaluations(testDocument.id);
      
      expect(document).toBeDefined();
      expect(document?.submittedBy).toBeDefined();
      expect(document?.submittedBy?.id).toBe(testUser.id);
      expect(document?.submittedBy?.name).toBe('Document Submitter');
      
      // This is the critical test - email should be null (not exposed)
      expect(document?.submittedBy?.email).toBeNull();
    });

    it('should properly include other submittedBy fields', async () => {
      const document = await DocumentModel.getDocumentWithEvaluations(testDocument.id);
      
      expect(document?.submittedBy).toMatchObject({
        id: testUser.id,
        name: 'Document Submitter',
        image: null,
      });
      
      // Verify email is set to null (not exposed)
      expect(document?.submittedBy?.email).toBeNull();
    });
  });

  describe('getUserDocumentsWithEvaluations', () => {
    it('should not expose submittedBy emails in document lists', async () => {
      const documents = await DocumentModel.getUserDocumentsWithEvaluations(testUser.id);
      
      expect(documents.length).toBeGreaterThan(0);
      
      const testDoc = documents.find(d => d.id === testDocument.id);
      expect(testDoc).toBeDefined();
      expect(testDoc?.submittedBy).toBeDefined();
      expect(testDoc?.submittedBy?.email).toBeNull();
    });
  });
});