import type { RawDocumentsCollection } from "@/types/documents";
import { transformDocumentsCollection } from "@/types/documents";

// Import individual documents
import aNoteOfCautionAboutRecentAiRiskCoverageEaForum from "./a-note-of-caution-about-recent-ai-risk-coverage-ea-forum.json";
import integrityForConsequentialistsEaForum from "./integrity-for-consequentialists-ea-forum.json";
import policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum from "./policy-advocacy-for-eradicating-screwworm-looks-remarkably-cost-effective-ea-forum.json";
import shortExample from "./short-example.json";
import stronglyBoundedAgents from "./strongly-bounded-agents.json";
import threeObservations from "./three-observations.json";

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [
    aNoteOfCautionAboutRecentAiRiskCoverageEaForum,
    integrityForConsequentialistsEaForum,
    policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum,
    shortExample,
    stronglyBoundedAgents,
    threeObservations,
  ],
} as RawDocumentsCollection);
