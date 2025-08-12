// Minimal repository declarations
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
}

export interface UpdateDocumentData {
  intendedAgentIds?: string[];
}

export interface DocumentRepositoryInterface {
  findById(id: string): Promise<DocumentEntity | null>;
  findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
  findByUser(userId: string, limit?: number): Promise<DocumentWithEvaluations[]>;
  findRecent(limit?: number): Promise<DocumentWithEvaluations[]>;
  findAll(): Promise<DocumentWithEvaluations[]>;
  create(data: CreateDocumentData): Promise<DocumentEntity>;
  updateContent(id: string, content: string, title: string): Promise<void>;
  updateMetadata(id: string, data: { intendedAgentIds?: string[] }): Promise<void>;
  delete(id: string): Promise<boolean>;
  checkOwnership(docId: string, userId: string): Promise<boolean>;
  search(query: string, limit?: number): Promise<any[]>;
  getStatistics(): Promise<any>;
}

export declare class DocumentRepository implements DocumentRepositoryInterface {
  constructor(prismaClient?: any);
  findById(id: string): Promise<DocumentEntity | null>;
  findWithEvaluations(id: string, includeStale?: boolean): Promise<DocumentWithEvaluations | null>;
  create(data: CreateDocumentData): Promise<DocumentEntity>;
}