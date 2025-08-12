/**
 * Service Factory
 * 
 * Centralized factory for creating service instances with proper dependency injection.
 * This eliminates duplication and ensures consistent service initialization.
 */

import { DocumentService, EvaluationService, DocumentValidator } from '@roast/domain';
import { DocumentRepository, EvaluationRepository } from '@roast/db';
import { createLoggerAdapter } from '@/infrastructure/logging/loggerAdapter';
import { AgentService } from './AgentService';
import { JobService } from './JobService';
import { AgentRepository } from '@/infrastructure/database/repositories/AgentRepository';

/**
 * Singleton service factory
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  
  private documentService?: DocumentService;
  private evaluationService?: EvaluationService;
  private agentService?: AgentService;
  private jobService?: JobService;
  
  // Repositories (shared across services)
  private documentRepository: DocumentRepository;
  private evaluationRepository: EvaluationRepository;
  private agentRepository: AgentRepository;
  
  // Validator
  private documentValidator: DocumentValidator;
  
  // Logger adapter
  private logger: any;
  
  private constructor() {
    // Initialize shared dependencies once
    this.documentRepository = new DocumentRepository();
    this.evaluationRepository = new EvaluationRepository();
    this.agentRepository = new AgentRepository();
    this.documentValidator = new DocumentValidator();
    this.logger = createLoggerAdapter();
  }
  
  static getInstance(): ServiceFactory {
    if (!ServiceFactory.instance) {
      ServiceFactory.instance = new ServiceFactory();
    }
    return ServiceFactory.instance;
  }
  
  /**
   * Get or create DocumentService instance
   */
  getDocumentService(): DocumentService {
    if (!this.documentService) {
      const evaluationService = this.getEvaluationService();
      this.documentService = new DocumentService(
        this.documentRepository,
        this.documentValidator,
        evaluationService,
        this.logger
      );
    }
    return this.documentService;
  }
  
  /**
   * Get or create EvaluationService instance
   */
  getEvaluationService(): EvaluationService {
    if (!this.evaluationService) {
      this.evaluationService = new EvaluationService(
        this.evaluationRepository,
        this.logger
      );
    }
    return this.evaluationService;
  }
  
  /**
   * Create new services with transaction support
   * Use this when you need services that share the same database transaction
   */
  createTransactionalServices(prismaTransaction: any) {
    // Create repositories with the transaction client
    const txDocumentRepo = new DocumentRepository(prismaTransaction);
    const txEvaluationRepo = new EvaluationRepository(prismaTransaction);
    
    // Create services with transactional repositories
    const txEvaluationService = new EvaluationService(
      txEvaluationRepo,
      this.logger
    );
    
    const txDocumentService = new DocumentService(
      txDocumentRepo,
      this.documentValidator,
      txEvaluationService,
      this.logger
    );
    
    // JobService doesn't need special transaction handling as it uses prisma directly
    const txJobService = new JobService();
    
    return {
      documentService: txDocumentService,
      evaluationService: txEvaluationService,
      jobService: txJobService
    };
  }
  
  /**
   * Get or create AgentService instance
   */
  getAgentService(): AgentService {
    if (!this.agentService) {
      this.agentService = new AgentService(
        this.agentRepository,
        this.logger
      );
    }
    return this.agentService;
  }

  /**
   * Get or create JobService instance
   */
  getJobService(): JobService {
    if (!this.jobService) {
      this.jobService = new JobService();
    }
    return this.jobService;
  }

  /**
   * Reset singleton instance (useful for testing)
   */
  static reset(): void {
    ServiceFactory.instance = undefined as any;
  }
}

// Export convenience function
export function getServices() {
  const factory = ServiceFactory.getInstance();
  return {
    documentService: factory.getDocumentService(),
    evaluationService: factory.getEvaluationService(),
    agentService: factory.getAgentService(),
    jobService: factory.getJobService(),
    createTransactionalServices: (prismaTransaction: any) => factory.createTransactionalServices(prismaTransaction)
  };
}