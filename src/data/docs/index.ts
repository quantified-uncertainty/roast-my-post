// Export document collection
import type { DocumentsCollection } from '@/types/documents';

// Import individual documents
import {
  document as epistemicImpactAnalysis,
} from './epistemic-impact-analysis';
import { document as genetics } from './genetics';
import { document as informationHazards } from './information-hazards';
import { document as valueLearning } from './value-learning';

// Export individual documents
export { epistemicImpactAnalysis, genetics, informationHazards, valueLearning };

export const documentsCollection: DocumentsCollection = {
  documents: [
    epistemicImpactAnalysis,
    genetics,
    informationHazards,
    valueLearning,
  ],
};
