// evaluation-storage-adapters.ts
// Example storage adapters for the evaluation library

import type { EvaluationResult, DocumentInput, AgentDefinition } from './types';

/**
 * Base interface for storage adapters
 */
export interface StorageAdapter {
  // Save evaluation result
  saveEvaluation(
    documentId: string, 
    agentId: string, 
    result: EvaluationResult
  ): Promise<string>;
  
  // Retrieve evaluation
  getEvaluation(evaluationId: string): Promise<EvaluationResult | null>;
  
  // List evaluations
  listEvaluations(filters?: {
    documentId?: string;
    agentId?: string;
    limit?: number;
    offset?: number;
  }): Promise<Array<{
    id: string;
    documentId: string;
    agentId: string;
    createdAt: Date;
    summary: string;
  }>>;
  
  // Optional: Save/load documents and agents
  saveDocument?(document: DocumentInput): Promise<string>;
  getDocument?(documentId: string): Promise<DocumentInput | null>;
  saveAgent?(agent: AgentDefinition): Promise<string>;
  getAgent?(agentId: string): Promise<AgentDefinition | null>;
}

/**
 * In-memory storage adapter (great for testing)
 */
export class MemoryAdapter implements StorageAdapter {
  private evaluations = new Map<string, any>();
  private documents = new Map<string, DocumentInput>();
  private agents = new Map<string, AgentDefinition>();
  private counter = 0;

  async saveEvaluation(
    documentId: string, 
    agentId: string, 
    result: EvaluationResult
  ): Promise<string> {
    const id = `eval-${++this.counter}`;
    this.evaluations.set(id, {
      id,
      documentId,
      agentId,
      result,
      createdAt: new Date()
    });
    return id;
  }

  async getEvaluation(evaluationId: string): Promise<EvaluationResult | null> {
    const evaluation = this.evaluations.get(evaluationId);
    return evaluation?.result || null;
  }

  async listEvaluations(filters?: any) {
    const results = Array.from(this.evaluations.values())
      .filter(e => {
        if (filters?.documentId && e.documentId !== filters.documentId) return false;
        if (filters?.agentId && e.agentId !== filters.agentId) return false;
        return true;
      })
      .map(e => ({
        id: e.id,
        documentId: e.documentId,
        agentId: e.agentId,
        createdAt: e.createdAt,
        summary: e.result.summary
      }));
    
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 10;
    
    return results.slice(offset, offset + limit);
  }

  async saveDocument(document: DocumentInput): Promise<string> {
    this.documents.set(document.id, document);
    return document.id;
  }

  async getDocument(documentId: string): Promise<DocumentInput | null> {
    return this.documents.get(documentId) || null;
  }
}

/**
 * Prisma adapter for existing database
 */
export class PrismaAdapter implements StorageAdapter {
  constructor(private prisma: any) {}

  async saveEvaluation(
    documentId: string, 
    agentId: string, 
    result: EvaluationResult
  ): Promise<string> {
    // Create evaluation record
    const evaluation = await this.prisma.evaluation.upsert({
      where: {
        documentId_agentId: { documentId, agentId }
      },
      create: { documentId, agentId },
      update: {}
    });

    // Create evaluation version
    const version = await this.prisma.evaluationVersion.create({
      data: {
        evaluationId: evaluation.id,
        agentId,
        summary: result.summary,
        analysis: result.analysis,
        grade: result.grade,
        selfCritique: result.selfCritique,
        metadata: result.metadata,
        version: 1, // Would need to calculate
      }
    });

    // Save comments with highlights
    for (const comment of result.comments) {
      const highlight = await this.prisma.evaluationHighlight.create({
        data: {
          startOffset: comment.highlight.startOffset,
          endOffset: comment.highlight.endOffset,
          quotedText: comment.highlight.quotedText,
          prefix: comment.highlight.prefix,
        }
      });

      await this.prisma.evaluationComment.create({
        data: {
          evaluationVersionId: version.id,
          highlightId: highlight.id,
          description: comment.description,
          importance: comment.importance,
          grade: comment.grade,
        }
      });
    }

    return evaluation.id;
  }

  async getEvaluation(evaluationId: string): Promise<EvaluationResult | null> {
    const evaluation = await this.prisma.evaluation.findUnique({
      where: { id: evaluationId },
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          include: {
            comments: {
              include: { highlight: true }
            }
          }
        }
      }
    });

    if (!evaluation || !evaluation.versions[0]) return null;

    const version = evaluation.versions[0];
    
    return {
      summary: version.summary,
      analysis: version.analysis,
      grade: version.grade,
      selfCritique: version.selfCritique,
      comments: version.comments.map((c: any) => ({
        description: c.description,
        importance: c.importance,
        grade: c.grade,
        highlight: {
          startOffset: c.highlight.startOffset,
          endOffset: c.highlight.endOffset,
          quotedText: c.highlight.quotedText,
          prefix: c.highlight.prefix,
        }
      })),
      metadata: version.metadata as any,
    };
  }

  async listEvaluations(filters?: any) {
    const where: any = {};
    if (filters?.documentId) where.documentId = filters.documentId;
    if (filters?.agentId) where.agentId = filters.agentId;

    const evaluations = await this.prisma.evaluation.findMany({
      where,
      take: filters?.limit || 10,
      skip: filters?.offset || 0,
      include: {
        versions: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { summary: true }
        }
      }
    });

    return evaluations.map((e: any) => ({
      id: e.id,
      documentId: e.documentId,
      agentId: e.agentId,
      createdAt: e.createdAt,
      summary: e.versions[0]?.summary || '',
    }));
  }

  async getDocument(documentId: string): Promise<DocumentInput | null> {
    const doc = await this.prisma.document.findUnique({
      where: { id: documentId },
      include: {
        versions: {
          orderBy: { version: 'desc' },
          take: 1
        }
      }
    });

    if (!doc || !doc.versions[0]) return null;

    const version = doc.versions[0];
    return {
      id: doc.id,
      title: version.title,
      content: version.content,
      author: version.authors.join(', '),
      publishedDate: doc.publishedDate,
      url: version.urls[0],
      platforms: version.platforms,
    };
  }
}

/**
 * File system adapter
 */
export class FileSystemAdapter implements StorageAdapter {
  constructor(private basePath: string) {}

  private getPath(type: string, id: string): string {
    return `${this.basePath}/${type}/${id}.json`;
  }

  async saveEvaluation(
    documentId: string, 
    agentId: string, 
    result: EvaluationResult
  ): Promise<string> {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const id = `${documentId}-${agentId}-${Date.now()}`;
    const filePath = this.getPath('evaluations', id);
    
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, JSON.stringify({
      id,
      documentId,
      agentId,
      result,
      createdAt: new Date().toISOString()
    }, null, 2));
    
    return id;
  }

  async getEvaluation(evaluationId: string): Promise<EvaluationResult | null> {
    const fs = await import('fs/promises');
    
    try {
      const filePath = this.getPath('evaluations', evaluationId);
      const data = JSON.parse(await fs.readFile(filePath, 'utf-8'));
      return data.result;
    } catch {
      return null;
    }
  }

  async listEvaluations(filters?: any) {
    const fs = await import('fs/promises');
    const path = await import('path');
    
    const evalDir = path.join(this.basePath, 'evaluations');
    
    try {
      const files = await fs.readdir(evalDir);
      const evaluations = [];
      
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        
        const data = JSON.parse(
          await fs.readFile(path.join(evalDir, file), 'utf-8')
        );
        
        if (filters?.documentId && data.documentId !== filters.documentId) continue;
        if (filters?.agentId && data.agentId !== filters.agentId) continue;
        
        evaluations.push({
          id: data.id,
          documentId: data.documentId,
          agentId: data.agentId,
          createdAt: new Date(data.createdAt),
          summary: data.result.summary
        });
      }
      
      return evaluations
        .slice(filters?.offset || 0, (filters?.offset || 0) + (filters?.limit || 10));
    } catch {
      return [];
    }
  }
}

/**
 * MongoDB adapter
 */
export class MongoAdapter implements StorageAdapter {
  private db: any;
  
  constructor(mongoClient: any, dbName: string) {
    this.db = mongoClient.db(dbName);
  }

  async saveEvaluation(
    documentId: string, 
    agentId: string, 
    result: EvaluationResult
  ): Promise<string> {
    const collection = this.db.collection('evaluations');
    
    const doc = {
      documentId,
      agentId,
      result,
      createdAt: new Date()
    };
    
    const insertResult = await collection.insertOne(doc);
    return insertResult.insertedId.toString();
  }

  async getEvaluation(evaluationId: string): Promise<EvaluationResult | null> {
    const { ObjectId } = await import('mongodb');
    const collection = this.db.collection('evaluations');
    
    const doc = await collection.findOne({ 
      _id: new ObjectId(evaluationId) 
    });
    
    return doc?.result || null;
  }

  async listEvaluations(filters?: any) {
    const collection = this.db.collection('evaluations');
    
    const query: any = {};
    if (filters?.documentId) query.documentId = filters.documentId;
    if (filters?.agentId) query.agentId = filters.agentId;
    
    const cursor = collection.find(query)
      .skip(filters?.offset || 0)
      .limit(filters?.limit || 10)
      .sort({ createdAt: -1 });
    
    const docs = await cursor.toArray();
    
    return docs.map(doc => ({
      id: doc._id.toString(),
      documentId: doc.documentId,
      agentId: doc.agentId,
      createdAt: doc.createdAt,
      summary: doc.result.summary
    }));
  }
}

/**
 * Usage examples
 */

// With Prisma
import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();
const prismaStorage = new PrismaAdapter(prisma);

// With file system
const fileStorage = new FileSystemAdapter('./evaluations');

// With memory (testing)
const memoryStorage = new MemoryAdapter();

// Using with evaluator
import { Evaluator } from '@roastmypost/evaluator';

export async function evaluateWithStorage(
  document: DocumentInput,
  agent: AgentDefinition,
  storage: StorageAdapter
) {
  const evaluator = new Evaluator();
  
  // Run evaluation
  const result = await evaluator.evaluate(document, agent);
  
  // Save to storage
  const evaluationId = await storage.saveEvaluation(
    document.id,
    agent.id,
    result
  );
  
  console.log(`Evaluation saved with ID: ${evaluationId}`);
  
  return { evaluationId, result };
}

// Middleware with storage
export function createStorageMiddleware(
  evaluator: Evaluator,
  storage: StorageAdapter
) {
  return async (req: any, res: any) => {
    const { documentId, agentId } = req.body;
    
    // Load from storage
    const document = await storage.getDocument?.(documentId);
    const agent = await storage.getAgent?.(agentId);
    
    if (!document || !agent) {
      return res.status(404).json({ error: 'Not found' });
    }
    
    // Evaluate
    const result = await evaluator.evaluate(document, agent);
    
    // Save result
    const evaluationId = await storage.saveEvaluation(
      documentId,
      agentId,
      result
    );
    
    res.json({ evaluationId, result });
  };
}