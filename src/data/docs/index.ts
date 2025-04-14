import type { RawDocumentsCollection } from '@/types/documents';
import { transformDocumentsCollection } from '@/types/documents';

// Import individual documents
import informationHazards from './information-hazards.json';
import stronglyBoundedAgents from './strongly-bounded-agents.json';

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [informationHazards, stronglyBoundedAgents],
} as RawDocumentsCollection);
