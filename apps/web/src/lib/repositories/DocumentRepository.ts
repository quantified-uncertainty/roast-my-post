/**
 * Document Repository
 * 
 * Data access layer for documents.
 * Handles all database operations related to documents.
 * Returns domain entities and formatted data.
 */

import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
import { 
  DocumentEntity, 
  DocumentWithEvaluations,
  CreateDocumentData,
  UpdateDocumentData 
} from '@/lib/domain/document/Document.entity';
import { DocumentFormatter } from '@/lib/domain/document/DocumentFormatter';
import { generateMarkdownPrepend } from '@/utils/documentMetadata';
import { getPublicUserFields } from '@/lib/user-permissions';

export class DocumentRepository {
  /**
   * Reusable Prisma include objects for consistent queries
   */
  private readonly includeUser = {
    select: getPublicUserFields()
  };

  private readonly includeVersions = {
    orderBy: { version: 'desc' as const },
    take: 1
  };

  private readonly includeAllVersions = {
    orderBy: { version: 'desc' as const }
  };

  private readonly includeEvaluations = {
    include: {
      agent: {
        include: {
          versions: {
            orderBy: { version: 'desc' as const },
            take: 1
          }
        }
      },
      versions: {
        orderBy: { version: 'desc' as const },
        take: 1,
        include: {
          comments: {
            include: {
              highlight: {
                select: {
                  id: true,
                  startOffset: true,
                  endOffset: true,
                  prefix: true,
                  quotedText: true,
                  isValid: true,
                  error: true
                }
              }
            }
          },
          job: {
            include: {
              tasks: true
            }
          },
          documentVersion: {
            select: {
              version: true
            }
          }
        }
      },
      jobs: {
        orderBy: { createdAt: 'desc' as const },
        take: 1
      }
    }
  };

  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<DocumentEntity | null> {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: this.includeVersions
      }
    });

    return doc ? this.toDomainEntity(doc) : null;
  }

  /**
   * Find a document with all its evaluations
   */
  async findWithEvaluations(
    id: string,
    includeStale: boolean = false
  ): Promise<DocumentWithEvaluations | null> {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: this.includeAllVersions,
        submittedBy: this.includeUser,
        evaluations: {
          where: includeStale ? {} : {
            versions: {
              some: {
                isStale: false
              }
            }
          },
          ...this.includeEvaluations
        }
      }
    });

    return doc ? DocumentFormatter.formatWithEvaluations(doc) : null;
  }

  /**
   * Create a new document
   */
  async create(data: CreateDocumentData): Promise<DocumentEntity> {
    const documentId = data.id || nanoid();
    const version = await prisma.documentVersion.findFirst({
      where: { documentId },
      select: { version: true },
      orderBy: { version: 'desc' }
    });

    const nextVersion = version ? version.version + 1 : 1;

    // Generate markdown prepend if needed
    const markdownPrepend = generateMarkdownPrepend({
      title: data.title,
      author: data.authors,
      publishedDate: data.publishedDate,
      platforms: data.platforms || []
    });

    const createData: any = {
      id: documentId,
      publishedDate: data.publishedDate || new Date(),
      submittedBy: { connect: { id: data.submittedById } }
    };
    
    // Only add ephemeralBatchId if it's defined
    if (data.ephemeralBatchId) {
      createData.ephemeralBatchId = data.ephemeralBatchId;
    }

    const doc = await prisma.document.create({
      data: {
        ...createData,
        versions: {
          create: {
            title: data.title,
            content: data.content,
            markdownPrepend,
            authors: [data.authors],
            urls: data.url ? [data.url] : [],
            importUrl: data.importUrl,
            platforms: data.platforms || [],
            version: nextVersion
          }
        }
      },
      include: {
        versions: this.includeVersions
      }
    });

    return this.toDomainEntity(doc);
  }

  /**
   * Update document content (creates new version)
   */
  async updateContent(
    id: string,
    content: string,
    title?: string
  ): Promise<DocumentEntity | null> {
    const doc = await prisma.document.findUnique({
      where: { id },
      include: {
        versions: this.includeVersions
      }
    });

    if (!doc) return null;

    const currentVersion = doc.versions[0];
    const nextVersion = currentVersion.version + 1;

    // Create new version
    await prisma.documentVersion.create({
      data: {
        documentId: id,
        title: title || currentVersion.title,
        content,
        markdownPrepend: currentVersion.markdownPrepend,
        authors: currentVersion.authors,
        urls: currentVersion.urls,
        platforms: currentVersion.platforms,
        version: nextVersion
      }
    });

    // Mark existing evaluations as stale
    await prisma.evaluationVersion.updateMany({
      where: {
        evaluation: { documentId: id },
        isStale: false
      },
      data: {
        isStale: true
      }
    });

    // Return updated document
    return this.findById(id);
  }

  /**
   * Update document metadata (doesn't create new version)
   */
  async updateMetadata(
    id: string,
    data: UpdateDocumentData
  ): Promise<boolean> {
    const updateData: any = {};

    if (data.intendedAgentIds !== undefined) {
      // Update intended agents
      // Get the latest version
      const latestVersion = await prisma.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: 'desc' }
      });

      if (latestVersion) {
        // Update intended agents on the latest version
        await prisma.documentVersion.update({
          where: { id: latestVersion.id },
          data: {
            intendedAgents: data.intendedAgentIds
          }
        });
      }
    }

    return true;
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    try {
      await prisma.document.delete({
        where: { id }
      });
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if a user owns a document
   */
  async checkOwnership(docId: string, userId: string): Promise<boolean> {
    const doc = await prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true }
    });

    return doc?.submittedById === userId;
  }

  /**
   * Find documents by user
   */
  async findByUser(
    userId: string,
    limit: number = 50
  ): Promise<DocumentWithEvaluations[]> {
    const docs = await prisma.document.findMany({
      where: { submittedById: userId },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        versions: this.includeVersions,
        submittedBy: this.includeUser,
        evaluations: {
          where: {
            versions: {
              some: {
                isStale: false
              }
            }
          },
          ...this.includeEvaluations
        }
      }
    });

    return DocumentFormatter.formatDocumentList(docs);
  }

  /**
   * Find recent documents
   */
  async findRecent(limit: number = 50): Promise<DocumentWithEvaluations[]> {
    const docs = await prisma.document.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        versions: this.includeVersions,
        submittedBy: this.includeUser,
        evaluations: {
          where: {
            versions: {
              some: {
                isStale: false
              }
            }
          },
          ...this.includeEvaluations
        }
      }
    });

    return DocumentFormatter.formatDocumentList(docs);
  }

  /**
   * Find all documents (for admin/monitoring)
   */
  async findAll(): Promise<DocumentWithEvaluations[]> {
    const docs = await prisma.document.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        versions: this.includeVersions,
        submittedBy: this.includeUser,
        evaluations: {
          ...this.includeEvaluations
        }
      }
    });

    return DocumentFormatter.formatDocumentList(docs);
  }

  /**
   * Search documents
   */
  async search(query: string, limit: number = 50): Promise<any[]> {
    const docs = await prisma.document.findMany({
      where: {
        OR: [
          {
            versions: {
              some: {
                title: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            }
          },
          {
            versions: {
              some: {
                content: {
                  contains: query,
                  mode: 'insensitive'
                }
              }
            }
          },
          {
            versions: {
              some: {
                authors: {
                  hasSome: [query]
                }
              }
            }
          }
        ]
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        versions: this.includeVersions,
        _count: {
          select: {
            evaluations: true
          }
        }
      }
    });

    return docs.map(doc => DocumentFormatter.formatSearchResult(doc));
  }

  /**
   * Convert database document to domain entity
   */
  private toDomainEntity(doc: any): DocumentEntity {
    const version = doc.versions[0];
    return new DocumentEntity(
      doc.id,
      version.title,
      version.content,
      version.authors[0] || 'Unknown',
      doc.publishedDate,
      version.urls?.[0] || null,
      version.platforms || [],
      doc.submittedById,
      version.importUrl,
      doc.ephemeralBatchId,
      doc.createdAt,
      doc.updatedAt,
      version.markdownPrepend
    );
  }

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<{
    totalDocuments: number;
    totalEvaluations: number;
    documentsThisWeek: number;
    evaluationsThisWeek: number;
  }> {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const [
      totalDocuments,
      totalEvaluations,
      documentsThisWeek,
      evaluationsThisWeek
    ] = await Promise.all([
      prisma.document.count(),
      prisma.evaluation.count(),
      prisma.document.count({
        where: { createdAt: { gte: weekAgo } }
      }),
      prisma.evaluation.count({
        where: { createdAt: { gte: weekAgo } }
      })
    ]);

    return {
      totalDocuments,
      totalEvaluations,
      documentsThisWeek,
      evaluationsThisWeek
    };
  }
}