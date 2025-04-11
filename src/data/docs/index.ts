// Import individual documents
import { document as epistemicImpactAnalysis } from './epistemic-impact-analysis';
import { document as valueLearning } from './value-learning';
import { document as informationHazards } from './information-hazards';

// Export individual documents
export {
  epistemicImpactAnalysis,
  valueLearning,
  informationHazards
};

// Export document collection
import type { DocumentsCollection } from '@/types/documents';

export const documentsCollection: DocumentsCollection = {
  documents: [
    epistemicImpactAnalysis,
    valueLearning,
    informationHazards
  ]
};