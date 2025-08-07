/**
 * Service Factory
 * 
 * Centralized factory for creating service instances with proper dependency injection.
 * This eliminates duplication and ensures consistent service initialization.
 */

import { DocumentService, EvaluationService, DocumentValidator } from '@roast/domain';
import { DocumentRepository, EvaluationRepository, JobRepository } from '@roast/db';
import { createLoggerAdapter } from '@/infrastructure/logging/loggerAdapter';
import { JobService } from './job/JobService';
import { JobOrchestrator } from './job/JobOrchestrator';

/**
 * Singleton service factory
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  
  private documentService?: DocumentService;
  private evaluationService?: EvaluationService;
  private jobService?: JobService;
  private jobOrchestrator?: JobOrchestrator;
  
  // Repositories (shared across services)
  private documentRepository: DocumentRepository;
  private evaluationRepository: EvaluationRepository;
  private jobRepository: JobRepository;
  
  // Validator
  private documentValidator: DocumentValidator;
  
  // Logger adapter
  private logger: any;
  
  private constructor() {
    // Initialize shared dependencies once
    this.documentRepository = new DocumentRepository();
    this.evaluationRepository = new EvaluationRepository();
    this.jobRepository = new JobRepository();
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
    
    return {
      documentService: txDocumentService,
      evaluationService: txEvaluationService
    };
  }
  
  /**
   * Get or create JobService instance
   */
  getJobService(): JobService {
    if (!this.jobService) {
      this.jobService = new JobService(
        this.jobRepository,
        this.logger
      );
    }
    return this.jobService;
  }

  /**
   * Get or create JobOrchestrator instance
   */
  getJobOrchestrator(): JobOrchestrator {
    if (!this.jobOrchestrator) {
      this.jobOrchestrator = new JobOrchestrator(
        this.getJobService(), // Use the service getter to ensure proper initialization
        this.logger
      );
    }
    return this.jobOrchestrator;
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
    jobService: factory.getJobService(),
    jobOrchestrator: factory.getJobOrchestrator()
  };
}