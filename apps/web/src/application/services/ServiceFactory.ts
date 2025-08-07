/**
 * Service Factory
 * 
 * Centralized factory for creating service instances with proper dependency injection.
 * This eliminates duplication and ensures consistent service initialization.
 */

import { DocumentService, EvaluationService, DocumentValidator } from '@roast/domain';
import { DocumentRepository, EvaluationRepository } from '@roast/db';
import { createLoggerAdapter } from '@/infrastructure/logging/loggerAdapter';

/**
 * Singleton service factory
 */
export class ServiceFactory {
  private static instance: ServiceFactory;
  
  private documentService?: DocumentService;
  private evaluationService?: EvaluationService;
  
  // Repositories (shared across services)
  private documentRepository: DocumentRepository;
  private evaluationRepository: EvaluationRepository;
  
  // Validator
  private documentValidator: DocumentValidator;
  
  // Logger adapter
  private logger: any;
  
  private constructor() {
    // Initialize shared dependencies once
    this.documentRepository = new DocumentRepository();
    this.evaluationRepository = new EvaluationRepository();
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
    // Create new repositories with the transaction client
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
    evaluationService: factory.getEvaluationService()
  };
}