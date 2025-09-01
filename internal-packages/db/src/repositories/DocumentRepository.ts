/**
 * Document Repository
 * 
 * Pure data access layer for documents.
 * Handles all database operations related to documents.
 * Returns domain entities with minimal dependencies.
 */

import { prisma as defaultPrisma } from '../client';
import { generateId } from '../utils/generateId';
import { generateMarkdownPrepend } from '@roast/domain';
import type { PrismaClient } from '../client';

// Types defined in this package to avoid circular dependencies
export interface DocumentEntity {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: Date | null;
  url: string | null;
  platforms: string[];
  submittedById: string;
  importUrl: string | null;
  ephemeralBatchId: string | null;
  createdAt: Date;
  updatedAt: Date;
  markdownPrepend?: string;
}

export interface DocumentWithEvaluations {
  id: string;
  title: string;
  content: string;
  author: string;
  publishedDate: string | null;
  url: string | null;
  platforms: string[];
  createdAt: Date;
  updatedAt: Date;
  submittedBy?: {
    id: string;
    name: string | null;
    email: string;
  };
  importUrl: string | null;
  ephemeralBatchId: string | null;
  reviews: any[];
  intendedAgents: string[];
}

export interface CreateDocumentData {
  id?: string;
  title: string;
  content: string;
  authors: string;
  publishedDate?: Date | null;
  url?: string | null;
  platforms?: string[];
  submittedById: string;
  importUrl?: string;
  ephemeralBatchId?: string;
  markdownPrepend?: string;
  isPrivate?: boolean;
}

export interface UpdateDocumentData {
  intendedAgentIds?: string[];
}

export interface DocumentRepositoryInterface {
  findById(id: string): Promise<DocumentEntity | null>;
  findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
  findByUser(userId: string, limit?: number): Promise<DocumentWithEvaluations[]>;
  findRecent(limit?: number, requestingUserId?: string): Promise<DocumentWithEvaluations[]>;
  findAll(): Promise<DocumentWithEvaluations[]>;
  create(data: CreateDocumentData): Promise<DocumentEntity>;
  updateContent(id: string, content: string, title: string): Promise<void>;
  updateMetadata(id: string, data: { intendedAgentIds?: string[] }): Promise<void>;
  delete(id: string): Promise<boolean>;
  checkOwnership(docId: string, userId: string): Promise<boolean>;
  search(query: string, limit?: number, requestingUserId?: string): Promise<any[]>;
  getStatistics(): Promise<any>;
}

export class DocumentRepository implements DocumentRepositoryInterface {
  private prisma: typeof defaultPrisma;
  
  constructor(prismaClient?: typeof defaultPrisma) {
    this.prisma = prismaClient || defaultPrisma;
  }
  
  /**
   * Find a document by ID
   */
  async findById(id: string): Promise<DocumentEntity | null> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1
        }
      }
    });

    return doc ? this.toDomainEntity(doc) : null;
  }

  /**
   * Find a document with evaluations by ID
   */
  async findWithEvaluations(id: string, includeStale = false): Promise<DocumentWithEvaluations | null> {
    const doc = await this.prisma.document.findUnique({
      where: { id },
      include: {
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        evaluations: {
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
              take: includeStale ? undefined : 1,
              where: includeStale ? undefined : { isStale: false },
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
                }
              }
            },
            jobs: {
              orderBy: { createdAt: 'desc' as const },
              take: 1
            }
          }
        }
      }
    });

    return doc ? this.toDocumentWithEvaluations(doc) : null;
  }

  /**
   * Find documents by user
   */
  async findByUser(userId: string, limit = 50): Promise<DocumentWithEvaluations[]> {
    const docs = await this.prisma.document.findMany({
      where: { submittedById: userId },
      include: {
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        evaluations: {
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
              where: { isStale: false }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return docs.map(doc => this.toDocumentWithEvaluations(doc));
  }

  /**
   * Find recent documents
   */
  async findRecent(limit = 50, requestingUserId?: string): Promise<DocumentWithEvaluations[]> {
    // Build privacy filter
    const privacyFilter = requestingUserId
      ? {
          OR: [
            { isPrivate: false },
            { submittedById: requestingUserId }
          ]
        }
      : { isPrivate: false }; // Anonymous users can only see public docs

    const docs = await this.prisma.document.findMany({
      where: privacyFilter,
      include: {
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        evaluations: {
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
              where: { isStale: false }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });

    return docs.map(doc => this.toDocumentWithEvaluations(doc));
  }

  /**
   * Find all documents (admin only)
   */
  async findAll(): Promise<DocumentWithEvaluations[]> {
    const docs = await this.prisma.document.findMany({
      include: {
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1
        },
        submittedBy: {
          select: {
            id: true,
            name: true,
            email: true
          }
        },
        evaluations: {
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
              where: { isStale: false }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return docs.map(doc => this.toDocumentWithEvaluations(doc));
  }

  /**
   * Create a new document
   */
  async create(data: CreateDocumentData): Promise<DocumentEntity> {
    const documentId = data.id || generateId();

    const doc = await this.prisma.document.create({
      data: {
        id: documentId,
        publishedDate: data.publishedDate || new Date(),
        submittedById: data.submittedById,
        ephemeralBatchId: data.ephemeralBatchId,
        isPrivate: data.isPrivate || false,
        versions: {
          create: {
            title: data.title,
            content: data.content,
            authors: [data.authors],
            urls: data.url ? [data.url] : [],
            platforms: data.platforms || [],
            importUrl: data.importUrl,
            markdownPrepend: data.markdownPrepend,
            version: 1
          }
        }
      },
      include: {
        versions: {
          orderBy: { version: 'desc' as const },
          take: 1
        }
      }
    });

    return this.toDomainEntity(doc);
  }

  /**
   * Update document content (creates new version)
   */
  async updateContent(id: string, content: string, title: string): Promise<void> {
    // Get the latest version and the document for publishedDate
    const [latestVersion, document] = await Promise.all([
      this.prisma.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: 'desc' }
      }),
      this.prisma.document.findUnique({
        where: { id },
        select: { publishedDate: true }
      })
    ]);

    const nextVersion = (latestVersion?.version || 0) + 1;
    
    // Generate fresh markdownPrepend with current metadata
    const markdownPrepend = generateMarkdownPrepend({
      title,
      author: latestVersion?.authors?.[0] || 'Unknown',
      platforms: latestVersion?.platforms || [],
      publishedDate: document?.publishedDate || null
    });

    await this.prisma.documentVersion.create({
      data: {
        documentId: id,
        title,
        content,
        authors: latestVersion?.authors || ['Unknown'],
        urls: latestVersion?.urls || [],
        platforms: latestVersion?.platforms || [],
        importUrl: latestVersion?.importUrl || null,
        markdownPrepend,
        version: nextVersion
      }
    });
  }

  /**
   * Update document metadata (doesn't create new version)
   */
  async updateMetadata(id: string, data: { intendedAgentIds?: string[] }): Promise<void> {
    // Since intendedAgents is in DocumentVersion, we need to update the latest version
    if (data.intendedAgentIds !== undefined) {
      const latestVersion = await this.prisma.documentVersion.findFirst({
        where: { documentId: id },
        orderBy: { version: 'desc' }
      });

      if (latestVersion) {
        await this.prisma.documentVersion.update({
          where: { id: latestVersion.id },
          data: {
            intendedAgents: data.intendedAgentIds
          }
        });
      }
    }
  }

  /**
   * Delete a document
   */
  async delete(id: string): Promise<boolean> {
    try {
      await this.prisma.document.delete({
        where: { id }
      });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Check if user owns a document
   */
  async checkOwnership(docId: string, userId: string): Promise<boolean> {
    const doc = await this.prisma.document.findUnique({
      where: { id: docId },
      select: { submittedById: true }
    });

    return doc?.submittedById === userId;
  }

  /**
   * Search documents
   */
  async search(query: string, limit = 50, requestingUserId?: string): Promise<any[]> {
    // Build privacy filter for the document relation
    const privacyFilter = requestingUserId
      ? {
          OR: [
            { isPrivate: false },
            { submittedById: requestingUserId }
          ]
        }
      : { isPrivate: false }; // Anonymous users can only see public docs

    return await this.prisma.documentVersion.findMany({
      where: {
        document: privacyFilter,
        OR: [
          {
            title: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            content: {
              contains: query,
              mode: 'insensitive'
            }
          },
          {
            searchableText: {
              contains: query,
              mode: 'insensitive'
            }
          }
        ]
      },
      include: {
        document: {
          select: {
            id: true,
            createdAt: true,
            submittedBy: {
              select: {
                id: true,
                name: true,
                email: true
              }
            }
          }
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  }

  /**
   * Get document statistics
   */
  async getStatistics(): Promise<any> {
    const [totalDocuments, totalEvaluations, recentDocuments] = await Promise.all([
      this.prisma.document.count(),
      this.prisma.evaluation.count(),
      this.prisma.document.count({
        where: {
          createdAt: {
            gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) // Last 7 days
          }
        }
      })
    ]);

    return {
      totalDocuments,
      totalEvaluations,
      recentDocuments
    };
  }

  /**
   * Convert database record to domain entity
   */
  private toDomainEntity(doc: any): DocumentEntity {
    if (!doc.versions || doc.versions.length === 0) {
      throw new Error(`Document ${doc.id} has no versions`);
    }

    const latestVersion = doc.versions[0];
    
    return {
      id: doc.id,
      title: latestVersion.title,
      content: latestVersion.content,
      author: latestVersion.authors?.[0] || 'Unknown',
      publishedDate: doc.publishedDate,
      url: latestVersion.urls?.[0] || null,
      platforms: latestVersion.platforms || [],
      submittedById: doc.submittedById,
      importUrl: latestVersion.importUrl,
      ephemeralBatchId: doc.ephemeralBatchId,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      markdownPrepend: latestVersion.markdownPrepend
    };
  }

  /**
   * Convert database record to document with evaluations
   */
  private toDocumentWithEvaluations(doc: any): DocumentWithEvaluations {
    if (!doc.versions || doc.versions.length === 0) {
      throw new Error(`Document ${doc.id} has no versions`);
    }

    const latestVersion = doc.versions[0];
    
    // Process evaluations/reviews
    const reviews = (doc.evaluations || []).map((evaluation: any) => {
      const latestEvalVersion = evaluation.versions?.[0];
      const latestJob = evaluation.jobs?.[0];
      const agentVersion = evaluation.agent?.versions?.[0];

      return {
        id: evaluation.id,
        agentId: evaluation.agentId,
        agentName: agentVersion?.name || 'Unknown Agent',
        agentDescription: agentVersion?.description || '',
        status: latestJob?.status?.toLowerCase() || 'pending',
        createdAt: evaluation.createdAt,
        summary: latestEvalVersion?.summary,
        analysis: latestEvalVersion?.analysis,
        grade: latestEvalVersion?.grade,
        comments: latestEvalVersion?.comments || [],
        completedAt: latestEvalVersion?.createdAt
      };
    });

    return {
      id: doc.id,
      title: latestVersion.title,
      content: latestVersion.content,
      author: latestVersion.authors?.[0] || 'Unknown',
      publishedDate: doc.publishedDate?.toISOString() || null,
      url: latestVersion.urls?.[0] || null,
      platforms: latestVersion.platforms || [],
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
      submittedBy: doc.submittedBy ? {
        id: doc.submittedBy.id,
        name: doc.submittedBy.name,
        email: doc.submittedBy.email
      } : undefined,
      importUrl: latestVersion.importUrl,
      ephemeralBatchId: doc.ephemeralBatchId,
      reviews,
      intendedAgents: latestVersion.intendedAgents || []
    };
  }
}