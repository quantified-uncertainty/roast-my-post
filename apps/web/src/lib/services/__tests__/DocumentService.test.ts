import { DocumentService } from '../DocumentService';
import { DocumentRepository } from '@/lib/repositories/DocumentRepository';
import { DocumentValidator } from '@/lib/domain/document/DocumentValidator';
import { ValidationError, NotFoundError, AuthorizationError } from '@/lib/core/errors';
import { DocumentEntity } from '@/lib/domain/document/Document.entity';

// Mock the dependencies
jest.mock('@/lib/repositories/DocumentRepository');
jest.mock('@/lib/domain/document/DocumentValidator');
jest.mock('@/lib/logger');

describe('DocumentService', () => {
  let service: DocumentService;
  let mockRepository: jest.Mocked<DocumentRepository>;
  let mockValidator: jest.Mocked<DocumentValidator>;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Create mock instances
    mockRepository = new DocumentRepository() as jest.Mocked<DocumentRepository>;
    mockValidator = new DocumentValidator() as jest.Mocked<DocumentValidator>;
    
    // Create service with mocked dependencies
    service = new DocumentService(mockRepository, mockValidator);
  });

  describe('createDocument', () => {
    const userId = 'test-user-id';
    const documentData = {
      title: 'Test Document',
      content: 'This is test content that is long enough to pass validation',
      authors: 'Test Author',
      url: 'https://example.com',
      platforms: ['test-platform'],
    };

    it('should successfully create a document', async () => {
      // Setup mocks
      mockValidator.validateCreate.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      mockValidator.sanitizeCreateData.mockReturnValue({
        title: documentData.title,
        content: documentData.content,
        authors: documentData.authors,
        url: documentData.url,
        platforms: documentData.platforms
      });

      const mockDocument = new DocumentEntity(
        'doc-123',
        documentData.title,
        documentData.content,
        documentData.authors,
        null, // publishedDate
        documentData.url,
        documentData.platforms,
        userId,
        undefined, // importUrl
        undefined, // ephemeralBatchId
        new Date(),
        new Date()
      );

      mockRepository.create.mockResolvedValue(mockDocument);

      // Execute
      const result = await service.createDocument(userId, documentData);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockDocument);
      expect(mockValidator.validateCreate).toHaveBeenCalledWith(documentData);
      expect(mockRepository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          submittedById: userId
        })
      );
    });

    it('should return validation error for invalid data', async () => {
      // Setup mocks
      mockValidator.validateCreate.mockReturnValue({
        isValid: false,
        errors: ['Content is too short', 'Title is required']
      });

      // Execute
      const result = await service.createDocument(userId, documentData);

      // Assert
      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.message).toBe('Invalid document data');
      expect((error as ValidationError).details).toEqual(['Content is too short', 'Title is required']);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should generate title from content if not provided', async () => {
      const dataWithoutTitle = { ...documentData, title: '' };
      
      mockValidator.generateTitleFromContent.mockReturnValue('Generated Title');
      mockValidator.validateCreate.mockReturnValue({
        isValid: true,
        errors: []
      });
      mockValidator.sanitizeCreateData.mockReturnValue({
        title: 'Generated Title',
        content: dataWithoutTitle.content,
        authors: dataWithoutTitle.authors,
        url: dataWithoutTitle.url,
        platforms: dataWithoutTitle.platforms
      });

      const mockDocument = new DocumentEntity(
        'doc-123',
        'Generated Title',
        dataWithoutTitle.content,
        dataWithoutTitle.authors,
        null,
        dataWithoutTitle.url,
        dataWithoutTitle.platforms,
        userId,
        undefined,
        undefined,
        new Date(),
        new Date()
      );

      mockRepository.create.mockResolvedValue(mockDocument);

      // Execute
      const result = await service.createDocument(userId, dataWithoutTitle);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockValidator.generateTitleFromContent).toHaveBeenCalledWith(dataWithoutTitle.content);
    });
  });

  describe('getDocumentForReader', () => {
    const docId = 'doc-123';
    const userId = 'test-user-id';

    it('should successfully fetch a document with evaluations', async () => {
      const mockDocument = {
        id: docId,
        title: 'Test Document',
        content: 'Test content',
        author: 'Test Author',
        publishedDate: null,
        url: null,
        platforms: [],
        createdAt: new Date(),
        updatedAt: new Date(),
        reviews: [],
        intendedAgents: []
      };

      mockRepository.findWithEvaluations.mockResolvedValue(mockDocument);

      // Execute
      const result = await service.getDocumentForReader(docId, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockDocument);
      expect(mockRepository.findWithEvaluations).toHaveBeenCalledWith(docId, false);
    });

    it('should return NotFoundError when document does not exist', async () => {
      mockRepository.findWithEvaluations.mockResolvedValue(null);

      // Execute
      const result = await service.getDocumentForReader(docId, userId);

      // Assert
      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(NotFoundError);
      expect(error?.message).toContain('Document');
    });
  });

  describe('updateDocument', () => {
    const docId = 'doc-123';
    const userId = 'test-user-id';
    const updates = {
      title: 'Updated Title',
      content: 'Updated content that is long enough'
    };

    it('should successfully update a document', async () => {
      mockRepository.checkOwnership.mockResolvedValue(true);
      mockValidator.validateUpdate.mockReturnValue({
        isValid: true,
        errors: []
      });
      
      const mockDocument = new DocumentEntity(
        docId,
        'Original Title',
        'Original content',
        'Test Author',
        null,
        null,
        [],
        userId,
        undefined,
        undefined,
        new Date(),
        new Date()
      );
      
      const updatedDocument = new DocumentEntity(
        docId,
        updates.title!,
        updates.content!,
        'Test Author',
        null,
        null,
        [],
        userId,
        undefined,
        undefined,
        new Date(),
        new Date()
      );
      
      mockRepository.findById.mockResolvedValue(mockDocument);
      mockRepository.updateContent.mockResolvedValue(updatedDocument);

      // Execute
      const result = await service.updateDocument(docId, userId, updates);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockRepository.checkOwnership).toHaveBeenCalledWith(docId, userId);
      expect(mockValidator.validateUpdate).toHaveBeenCalledWith(updates);
      expect(mockRepository.updateContent).toHaveBeenCalledWith(
        docId,
        updates.content,
        updates.title
      );
    });

    it('should return AuthorizationError when user does not own document', async () => {
      mockRepository.checkOwnership.mockResolvedValue(false);

      // Execute
      const result = await service.updateDocument(docId, userId, updates);

      // Assert
      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(error?.message).toContain('permission');
      expect(mockRepository.updateContent).not.toHaveBeenCalled();
    });
  });

  describe('deleteDocument', () => {
    const docId = 'doc-123';
    const userId = 'test-user-id';

    it('should successfully delete a document', async () => {
      mockRepository.checkOwnership.mockResolvedValue(true);
      mockRepository.delete.mockResolvedValue(true);

      // Execute
      const result = await service.deleteDocument(docId, userId);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(mockRepository.checkOwnership).toHaveBeenCalledWith(docId, userId);
      expect(mockRepository.delete).toHaveBeenCalledWith(docId);
    });

    it('should return AuthorizationError when user does not own document', async () => {
      mockRepository.checkOwnership.mockResolvedValue(false);

      // Execute
      const result = await service.deleteDocument(docId, userId);

      // Assert
      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(AuthorizationError);
      expect(mockRepository.delete).not.toHaveBeenCalled();
    });

    it('should return NotFoundError when document does not exist', async () => {
      mockRepository.checkOwnership.mockResolvedValue(true);
      mockRepository.delete.mockResolvedValue(false);

      // Execute
      const result = await service.deleteDocument(docId, userId);

      // Assert
      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(NotFoundError);
    });
  });

  describe('searchDocuments', () => {
    it('should successfully search documents', async () => {
      const query = 'test query';
      const limit = 10;
      const mockResults = [
        { id: 'doc-1', title: 'Result 1', content: 'Content 1', author: 'Author 1' },
        { id: 'doc-2', title: 'Result 2', content: 'Content 2', author: 'Author 2' }
      ];

      mockRepository.search.mockResolvedValue(mockResults);

      // Execute
      const result = await service.searchDocuments(query, limit);

      // Assert
      expect(result.isOk()).toBe(true);
      expect(result.unwrap()).toEqual(mockResults);
      expect(mockRepository.search).toHaveBeenCalledWith(query.trim(), limit);
    });

    it('should return ValidationError for short query', async () => {
      const query = 'a';

      // Execute
      const result = await service.searchDocuments(query);

      // Assert
      expect(result.isError()).toBe(true);
      const error = result.error();
      expect(error).toBeInstanceOf(ValidationError);
      expect(error?.message).toContain('at least 2 characters');
      expect(mockRepository.search).not.toHaveBeenCalled();
    });
  });
});