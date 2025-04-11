// Export document collection
import type { DocumentsCollection } from '@/types/documents';

// Import individual documents
import { document as informationHazards } from './information-hazards';

// Export individual documents
export { informationHazards };

export const documentsCollection: DocumentsCollection = {
  documents: [informationHazards],
};
