import { DocumentModel } from '../Document';
import { prisma } from '@/lib/prisma';

// Mock Prisma
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      findMany: jest.fn(),
    },
    job: {
      create: jest.fn(),
      deleteMany: jest.fn(),
    },
    evaluation: {
      findFirst: jest.fn(),
      create: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

// Mock DocumentSchema
jest.mock('@/types/documentSchema', () => ({
  DocumentSchema: {
    parse: jest.fn((data) => data),
  },
}));

describe('DocumentModel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getDocumentWithEvaluations', () => {
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
                costInCents: 120,
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
                costInCents: 100,
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

    it('should filter out stale evaluations by default (includeStale=false)', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDbDoc);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(1);
      
      // Should include the evaluation since its latest version matches current document version (2)
      const evaluation = result?.reviews[0];
      expect(evaluation?.versions).toHaveLength(2); // All versions are included
      expect(evaluation?.versions?.[0]?.documentVersion?.version).toBe(2); // Latest version matches current
    });

    it('should include all evaluations when includeStale=true', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDbDoc);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123', true);

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(1);
      
      // Should include all evaluation versions
      const evaluation = result?.reviews[0];
      expect(evaluation?.versions).toHaveLength(2);
    });

    it('should handle documents with no evaluations', async () => {
      const mockDocWithoutEvals = {
        ...mockDbDoc,
        evaluations: [],
      };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocWithoutEvals);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(0);
    });

    it('should handle evaluations with no versions', async () => {
      const mockDocWithEmptyEvals = {
        ...mockDbDoc,
        evaluations: [
          {
            ...mockDbDoc.evaluations[0],
            versions: [],
          }
        ],
      };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocWithEmptyEvals);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(0); // Should filter out evaluation with no versions
    });

    it('should filter out evaluations where latest version is stale', async () => {
      const mockDocWithStaleEval = {
        ...mockDbDoc,
        evaluations: [
          {
            ...mockDbDoc.evaluations[0],
            versions: [
              // Latest version is stale (version 1, current doc is version 2)
              {
                ...mockDbDoc.evaluations[0].versions[1], // version 1
                id: 'eval-version-stale-latest',
              }
            ],
          }
        ],
      };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocWithStaleEval);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(0); // Should filter out entire evaluation
    });

    it('should handle mix of current and stale evaluations', async () => {
      const mockDocMixedEvals = {
        ...mockDbDoc,
        evaluations: [
          // Current evaluation
          {
            ...mockDbDoc.evaluations[0],
            id: 'eval-current',
            agentId: 'agent-current',
            versions: [
              {
                ...mockDbDoc.evaluations[0].versions[0], // version matching current doc version (first = latest)
                id: 'eval-version-current',
              }
            ],
          },
          // Stale evaluation
          {
            ...mockDbDoc.evaluations[0],
            id: 'eval-stale',
            agentId: 'agent-stale',
            versions: [
              {
                ...mockDbDoc.evaluations[0].versions[1], // version 1, doc is version 2 (second = stale)
                id: 'eval-version-stale',
              }
            ],
          }
        ],
      };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocMixedEvals);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeTruthy();
      expect(result?.reviews).toHaveLength(1); // Only current evaluation
      expect(result?.reviews[0]?.id).toBe('eval-current');
    });

    it('should return null for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      const result = await DocumentModel.getDocumentWithEvaluations('non-existent');

      expect(result).toBeNull();
    });

    it('should return null for document with no versions', async () => {
      const mockDocNoVersions = {
        ...mockDbDoc,
        versions: [],
      };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocNoVersions);

      const result = await DocumentModel.getDocumentWithEvaluations('doc-123');

      expect(result).toBeNull();
    });
  });

  describe('getDocumentWithAllEvaluations', () => {
    it('should be equivalent to getDocumentWithEvaluations(docId, true)', async () => {
      const mockDoc = { id: 'test' };
      const getDocumentWithEvaluationsSpy = jest.spyOn(DocumentModel, 'getDocumentWithEvaluations')
        .mockResolvedValue(mockDoc as any);

      const result = await DocumentModel.getDocumentWithAllEvaluations('doc-123');

      expect(getDocumentWithEvaluationsSpy).toHaveBeenCalledWith('doc-123', true);
      expect(result).toBe(mockDoc);

      getDocumentWithEvaluationsSpy.mockRestore();
    });
  });

  describe('update', () => {
    const mockDocument = {
      id: 'doc-123',
      submittedById: 'user-123',
      versions: [
        { version: 1 }
      ]
    };

    const mockUpdatedDocument = {
      ...mockDocument,
      versions: [
        { version: 2 }
      ],
      evaluations: [
        { id: 'eval-1' },
        { id: 'eval-2' }
      ]
    };

    const updateData = {
      title: 'Updated Title',
      authors: 'Author 1, Author 2',
      content: 'Updated content',
      urls: 'https://example.com',
      platforms: 'platform1, platform2',
      intendedAgents: 'agent1, agent2',
      importUrl: 'https://source.com',
    };

    beforeEach(() => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocument);
      (prisma.document.update as jest.Mock).mockResolvedValue(mockUpdatedDocument);
      (prisma.job.create as jest.Mock).mockResolvedValue({ id: 'job-new' });
    });

    it('should update document and create new version', async () => {
      const result = await DocumentModel.update('doc-123', updateData, 'user-123');

      expect(prisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'doc-123' },
          data: expect.objectContaining({
            versions: {
              create: expect.objectContaining({
                version: 2,
                title: updateData.title,
                authors: ['Author 1', 'Author 2'],
                content: updateData.content,
              })
            }
          }),
          include: expect.objectContaining({
            evaluations: true,
          })
        })
      );

      expect(result).toBe(mockUpdatedDocument);
    });

    it('should automatically queue re-evaluations for existing evaluations', async () => {
      await DocumentModel.update('doc-123', updateData, 'user-123');

      // Should create jobs for both evaluations
      expect(prisma.job.create).toHaveBeenCalledTimes(2);
      expect(prisma.job.create).toHaveBeenCalledWith({
        data: {
          status: 'PENDING',
          evaluation: {
            connect: { id: 'eval-1' }
          }
        }
      });
      expect(prisma.job.create).toHaveBeenCalledWith({
        data: {
          status: 'PENDING',
          evaluation: {
            connect: { id: 'eval-2' }
          }
        }
      });
    });

    it('should not create jobs when no evaluations exist', async () => {
      const mockDocumentNoEvals = {
        ...mockUpdatedDocument,
        evaluations: []
      };
      (prisma.document.update as jest.Mock).mockResolvedValue(mockDocumentNoEvals);

      await DocumentModel.update('doc-123', updateData, 'user-123');

      expect(prisma.job.create).not.toHaveBeenCalled();
    });

    it('should throw error for non-existent document', async () => {
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(null);

      await expect(
        DocumentModel.update('non-existent', updateData, 'user-123')
      ).rejects.toThrow('Document not found');
    });

    it('should throw error for unauthorized user', async () => {
      await expect(
        DocumentModel.update('doc-123', updateData, 'wrong-user')
      ).rejects.toThrow("You don't have permission to update this document");
    });

    it('should increment version number correctly', async () => {
      const mockDocumentV5 = {
        ...mockDocument,
        versions: [{ version: 5 }]
      };
      (prisma.document.findUnique as jest.Mock).mockResolvedValue(mockDocumentV5);

      await DocumentModel.update('doc-123', updateData, 'user-123');

      expect(prisma.document.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            versions: {
              create: expect.objectContaining({
                version: 6,
              })
            }
          })
        })
      );
    });
  });
});