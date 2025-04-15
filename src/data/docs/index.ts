import type { RawDocumentsCollection } from "@/types/documents";
import { transformDocumentsCollection } from "@/types/documents";

// Import individual documents
import informationHazards from "./information-hazards.json";
import shortExample from "./short-example.json";
import stronglyBoundedAgents from "./strongly-bounded-agents.json";
import threeObservations from "./three-observations.json";

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [
    informationHazards,
    shortExample,
    stronglyBoundedAgents,
    threeObservations,
  ],
} as RawDocumentsCollection);
