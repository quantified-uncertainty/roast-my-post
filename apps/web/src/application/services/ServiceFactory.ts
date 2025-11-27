/**
 * Service Factory
 * 
 * Centralized factory for creating service instances with proper dependency injection.
 * This eliminates duplication and ensures consistent service initialization.
 */

import { DocumentService, EvaluationService, DocumentValidator } from '@roast/domain';
import { DocumentRepository, EvaluationRepository, JobRepository } from '@roast/db';
import { PgBossService, JobService } from '@roast/jobs';
import { createLoggerAdapter } from '@/infrastructure/logging/loggerAdapter';
import { AgentService } from './AgentService';
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
  private jobRepository: JobRepository;
  
  // Validator
  private documentValidator: DocumentValidator;
  
  // Logger adapter
  private logger: any;
  private pgBossService: PgBossService;
  
  private constructor() {
    // Initialize shared dependencies once
    this.documentRepository = new DocumentRepository();
    this.evaluationRepository = new EvaluationRepository();
    this.agentRepository = new AgentRepository();
    this.jobRepository = new JobRepository();
    this.documentValidator = new DocumentValidator();
    this.logger = createLoggerAdapter();
    this.pgBossService = new PgBossService(this.logger);
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
    
    // JobService uses repository, so we create a new instance with the tx repository
    const txJobService = new JobService(
      new JobRepository(prismaTransaction),
      this.logger,
      this.pgBossService
    );
    
    // Initialize the service (fire and forget)
    txJobService.initialize().catch(err => {
      this.logger.error('Failed to initialize txJobService', err);
    });

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
      this.jobService = new JobService(
        this.jobRepository,
        this.logger,
        this.pgBossService
      );
      this.jobService.initialize().catch(err => {
        this.logger.error('Failed to initialize JobService', err);
      });
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
