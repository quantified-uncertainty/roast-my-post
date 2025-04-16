import type { RawDocumentsCollection } from "@/types/documents";
import { transformDocumentsCollection } from "@/types/documents";

import aNoteOfCautionAboutRecentAiRiskCoverageEaForum from "./a-note-of-caution-about-recent-ai-risk-coverage-ea-forum.json";
import aSketchOfAiDrivenEpistemicLockInEaForumBots from "./a-sketch-of-ai-driven-epistemic-lock-in-ea-forum-bots.json";
import aiForResolvingForecastingQuestionsAnEarlyExplorationEaForumBots from "./ai-for-resolving-forecasting-questions-an-early-exploration-ea-forum-bots.json";
import integrityForConsequentialistsEaForum from "./integrity-for-consequentialists-ea-forum.json";
import myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsEaForumBots from "./my-current-claims-and-cruxes-on-llm-forecasting-epistemics-ea-forum-bots.json";
import policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum from "./policy-advocacy-for-eradicating-screwworm-looks-remarkably-cost-effective-ea-forum.json";
import quriRecommendedAiEpistemicsProjects from "./quri-recommended-ai-epistemics-projects.json";
import shortExample from "./short-example.json";
// Import individual documents
import sixPotentialMisconceptionsAboutAiIntellectualsEaForumBots from "./six-potential-misconceptions-about-ai-intellectuals-ea-forum-bots.json";
import slopworld2035TheDangersOfMediocreAiEaForumBots from "./slopworld-2035-the-dangers-of-mediocre-ai-ea-forum-bots.json";
import stronglyBoundedAgents from "./strongly-bounded-agents.json";
import threeObservations from "./three-observations.json";
import whyISignedUpToThe10PledgeInTheWakeOfForeignAidCutsAndWhereYouCanDonateEaForumBots from "./why-i-signed-up-to-the-10-pledge-in-the-wake-of-foreign-aid-cuts-and-where-you-can-donate-ea-forum-bots.json";

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [
    sixPotentialMisconceptionsAboutAiIntellectualsEaForumBots,
    aNoteOfCautionAboutRecentAiRiskCoverageEaForum,
    aSketchOfAiDrivenEpistemicLockInEaForumBots,
    aiForResolvingForecastingQuestionsAnEarlyExplorationEaForumBots,
    integrityForConsequentialistsEaForum,
    myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsEaForumBots,
    policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum,
    quriRecommendedAiEpistemicsProjects,
    shortExample,
    slopworld2035TheDangersOfMediocreAiEaForumBots,
    stronglyBoundedAgents,
    threeObservations,
    whyISignedUpToThe10PledgeInTheWakeOfForeignAidCutsAndWhereYouCanDonateEaForumBots,
  ],
} as RawDocumentsCollection);
