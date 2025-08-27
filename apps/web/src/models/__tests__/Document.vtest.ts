import { vi } from 'vitest';
import { DocumentModel } from '../Document';
import { prisma } from '@roast/db';

// Mock Prisma
vi.mock('@roast/db', () => ({
  prisma: {
    document: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    },
    job: {
      create: vi.fn(),
      deleteMany: vi.fn(),
    },
    evaluation: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    $transaction: vi.fn(),
  },
}));

// Mock DocumentValidationSchema
vi.mock('@/shared/types/validationSchemas', () => ({
  DocumentValidationSchema: {
    parse: vi.fn((data) => data),
  },
}));

describe('DocumentModel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getDocumentWithEvaluations', () => {
    // Note: With the new isStale field approach, filtering happens at the database level
    // These tests assume the database query already filters based on isStale field
    const mockDbDoc = {
      id: 'doc-123',
      publishedDate: new Date('2024-01-01'),
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      submittedById: 'user-123',
      submittedBy: {
        id: 'user-123',
        name: 'Test User',
        email: 'test@example.com',
        image: null,
      },
      versions: [
        {
          id: 'version-2',
          version: 2,
          title: 'Test Document',
          content: 'Updated content',
          markdownPrepend: null,
          platforms: ['test'],
          intendedAgents: ['agent-1'],
          authors: ['Author'],
          urls: ['https://example.com'],
          importUrl: null,
          createdAt: new Date('2024-01-02'),
          updatedAt: new Date('2024-01-02'),
          documentId: 'doc-123',
        }
      ],
      evaluations: [
        {
          id: 'eval-1',
          createdAt: new Date('2024-01-01'),
          documentId: 'doc-123',
          agentId: 'agent-1',
          agent: {
            id: 'agent-1',
            versions: [{
              id: 'agent-version-1',
              version: 1,
              name: 'Test Agent',
              description: 'Test Description',
              primaryInstructions: 'Instructions',
              selfCritiqueInstructions: null,
            }]
          },
          versions: [
            // Latest version first (ordered by createdAt desc)
            {
              id: 'eval-version-2',
              version: 2,
              createdAt: new Date('2024-01-02'),
              summary: 'Updated summary',
              analysis: 'Updated analysis',
              grade: 90,
              selfCritique: null,
              comments: [],
              job: {
                id: 'job-2',
                priceInDollars: 0.0012,
                llmThinking: 'Updated thinking...',
                durationInSeconds: 25,
                logs: null,
                tasks: [],
              },
              documentVersion: {
                version: 2, // This is current
              },
            },
            {
              id: 'eval-version-1',
              version: 1,
              createdAt: new Date('2024-01-01'),
              summary: 'Test summary',
              analysis: 'Test analysis',
              grade: 85,
              selfCritique: null,
              comments: [],
              job: {
                id: 'job-1',
                priceInDollars: 0.001,
                llmThinking: 'Thinking...',
                durationInSeconds: 30,
                logs: null,
                tasks: [],
              },
              documentVersion: {
                version: 1, // This is stale (current is 2)
              },
            }
          ],
          jobs: [
            {
              id: 'job-1',
              status: 'COMPLETED',
              createdAt: new Date('2024-01-01'),
            },
            {
              id: 'job-2',
              status: 'COMPLETED',
              createdAt: new Date('2024-01-02'),
            }
          ],
        }
      ],
    };

    it('should use database filtering for stale evaluations by default (includeStale=false)', async () => {
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDbDoc);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(1);
      
      // Verify that the query was called with proper where clause for filtering
      // When includeStale=false and includePending=true (default for getDocumentWithEvaluations)
      expect(prisma.document.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-123' },
          include: expect.objectContaining({
            evaluations: expect.objectContaining({
              where: {
                OR: [
                  { versions: { none: {} } }, // Include pending evaluations
                  { versions: { some: { isStale: false } } }, // Include non-stale evaluations
                ],
              },
            }),
          }),
        })
      );
    });

    it('should not filter evaluations when includeStale=true', async () => {
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDbDoc);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123', true);

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(1);
      
      // Verify that the query was called without filtering
      expect(prisma.document.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-123' },
          include: expect.objectContaining({
            evaluations: expect.objectContaining({
              where: {},
            }),
          }),
        })
      );
    });

    it('should handle documents with no evaluations', async () => {
      const mockDocWithoutEvals = {
        ...mockDbDoc,
        evaluations: [],
      };
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDocWithoutEvals);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(0);
    });

    it('should handle evaluations with no versions', async () => {
      // With DB-level filtering, evaluations with no non-stale versions are filtered at DB
      const mockDocWithEmptyEvals = {
        ...mockDbDoc,
        evaluations: [], // DB returns no evaluations when all are filtered
      };
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDocWithEmptyEvals);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(0);
    });

    it('should filter out evaluations where latest version is stale', async () => {
      // With DB-level filtering, stale evaluations are filtered at DB
      const mockDocWithStaleEval = {
        ...mockDbDoc,
        evaluations: [], // DB returns no evaluations when all are stale
      };
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDocWithStaleEval);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(0);
    });

    it('should handle mix of current and stale evaluations', async () => {
      // With DB-level filtering, only non-stale evaluations are returned
      const mockDocMixedEvals = {
        ...mockDbDoc,
        evaluations: [
          // Only current evaluation is returned by DB
          {
            ...mockDbDoc.evaluations[0],
            id: 'eval-current',
            agentId: 'agent-current',
            versions: [
              {
                ...mockDbDoc.evaluations[0].versions[0], // version matching current doc version
                id: 'eval-version-current',
                isStale: false,
              }
            ],
          },
        ],
      };
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDocMixedEvals);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(1);
      expect(result?.reviews[0]?.id).toBe('eval-current');
    });

    it('should return null for non-existent document', async () => {
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(null);

      const result = await DocumentModel.getDocumentWithEvaluations('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for document with no versions', async () => {
      const mockDocNoVersions = {
        ...mockDbDoc,
        versions: [],
      };
      (prisma.document.findUnique as vi.MockedFunction<any>).mockResolvedValue(mockDocNoVersions);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeNull();
    });
  });

  describe('update', () => {
    const mockTransaction = {
      document: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      evaluationVersion: {
        updateMany: vi.fn(),
      },
      job: {
        createMany: vi.fn(),
      },
    };

    beforeEach(() => {
      (prisma.$transaction as vi.MockedFunction<any>).mockImplementation(async (fn) => {
        return fn(mockTransaction);
      });
    });

    it('should update document with transaction safety', async () => {
      const mockDocument = {
        id: 'doc-123',
        submittedById: 'user-123',
        versions: [{ version: 1 }],
        evaluations: [
          { id: 'eval-1' },
          { id: 'eval-2' },
        ],
      };

      mockTransaction.document.findUnique.mockResolvedValue(mockDocument);
      mockTransaction.document.update.mockResolvedValue({
        ...mockDocument,
        versions: [{ version: 2 }],
      });
      mockTransaction.evaluationVersion.updateMany.mockResolvedValue({ count: 3 });
      mockTransaction.job.createMany.mockResolvedValue({ count: 2 });

      const result = await DocumentModel.update(
        'doc-123',
        {
          title: 'Updated Title',
          authors: 'John Doe',
          content: 'Updated content',
        },
        'user-123'
      );

      // Verify transaction was used with serializable isolation
      expect(prisma.$transaction).toHaveBeenCalledWith(
        expect.any(Function),
        { isolationLevel: 'Serializable' }
      );

      // Verify evaluation versions were marked as stale
      expect(mockTransaction.evaluationVersion.updateMany).toHaveBeenCalledWith({
        where: {
          evaluation: {
            documentId: 'doc-123',
          },
          isStale: false,
        },
        data: {
          isStale: true,
        },
      });

      // Verify jobs were created for re-evaluation
      expect(mockTransaction.job.createMany).toHaveBeenCalledWith({
        data: [
          { status: 'PENDING', evaluationId: 'eval-1' },
          { status: 'PENDING', evaluationId: 'eval-2' },
        ],
      });

      expect(result).toBeTruthy();
    });

    it('should throw error if document not found', async () => {
      mockTransaction.document.findUnique.mockResolvedValue(null);

      await expect(
        DocumentModel.update('non-existent', { 
          title: 'Test',
          authors: 'Test Author',
          content: 'Test content'
        }, 'user-123')
      ).rejects.toThrow('Document not found');
    });

    it('should throw error if user lacks permission', async () => {
      mockTransaction.document.findUnique.mockResolvedValue({
        id: 'doc-123',
        submittedById: 'other-user',
        versions: [{ version: 1 }],
      });

      await expect(
        DocumentModel.update('doc-123', { 
          title: 'Test',
          authors: 'Test Author',
          content: 'Test content'
        }, 'user-123')
      ).rejects.toThrow("You don't have permission to update this document");
    });

    it('should handle documents with no evaluations', async () => {
      const mockDocument = {
        id: 'doc-123',
        submittedById: 'user-123',
        versions: [{ version: 1 }],
        evaluations: [], // No evaluations
      };

      mockTransaction.document.findUnique.mockResolvedValue(mockDocument);
      mockTransaction.document.update.mockResolvedValue({
        ...mockDocument,
        versions: [{ version: 2 }],
      });

      const result = await DocumentModel.update(
        'doc-123',
        { title: 'Updated Title', authors: 'John Doe', content: 'Updated' },
        'user-123'
      );

      // Should still mark evaluation versions as stale (even if none exist)
      expect(mockTransaction.evaluationVersion.updateMany).toHaveBeenCalled();
      
      // Should not create any jobs
      expect(mockTransaction.job.createMany).not.toHaveBeenCalled();

      expect(result).toBeTruthy();
    });
  });

  describe('getDocumentWithAllEvaluations', () => {
    it('should be equivalent to getDocumentWithEvaluations(docId, true)', async () => {
      const mockDoc = { id: 'test' };
      const getDocumentWithEvaluationsSpy = vi.spyOn(DocumentModel, 'getDocumentWithEvaluations')
        .mockResolvedValue(mockDoc as any);

      const result = await DocumentModel.getDocumentWithAllEvaluations('doc-123');

      expect(getDocumentWithEvaluationsSpy).toHaveBeenCalledWith('doc-123', true);
      expect(result).toBe(mockDoc);

      getDocumentWithEvaluationsSpy.mockRestore();
    });
  });
});