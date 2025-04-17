import type { RawDocumentsCollection } from '@/types/documents';
import { transformDocumentsCollection } from '@/types/documents';

// Import individual documents
import 6PotentialMisconceptionsAboutAiIntellectualsEaForumBots from './6-potential-misconceptions-about-ai-intellectuals-ea-forum-bots.json';
import aCaseForSuperhumanGovernanceUsingAiLesswrong from './a-case-for-superhuman-governance-using-ai-lesswrong.json';
import aNoteOfCautionAboutRecentAiRiskCoverageEaForum from './a-note-of-caution-about-recent-ai-risk-coverage-ea-forum.json';
import aSketchOfAiDrivenEpistemicLockInEaForumBots from './a-sketch-of-ai-driven-epistemic-lock-in-ea-forum-bots.json';
import aiForResolvingForecastingQuestionsAnEarlyExplorationEaForumBots from './ai-for-resolving-forecasting-questions-an-early-exploration-ea-forum-bots.json';
import canWeHoldIntellectualsToSimilarPublicStandardsAsAthletesLesswrong from './can-we-hold-intellectuals-to-similar-public-standards-as-athletes-lesswrong.json';
import higherOrderForecastsLesswrong from './higher-order-forecasts-lesswrong.json';
import integrityForConsequentialistsEaForum from './integrity-for-consequentialists-ea-forum.json';
import myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsEaForumBots from './my-current-claims-and-cruxes-on-llm-forecasting-epistemics-ea-forum-bots.json';
import myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsLesswrong from './my-current-claims-and-cruxes-on-llm-forecasting-epistemics-lesswrong.json';
import openCommunicationInTheDaysOfMaliciousOnlineActorsLesswrong from './open-communication-in-the-days-of-malicious-online-actors-lesswrong.json';
import policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum from './policy-advocacy-for-eradicating-screwworm-looks-remarkably-cost-effective-ea-forum.json';
import quriRecommendedAiEpistemicsProjects from './quri-recommended-ai-epistemics-projects.json';
import scorableFunctionsAFormatForAlgorithmicForecastingLesswrong from './scorable-functions-a-format-for-algorithmic-forecasting-lesswrong.json';
import shortExample from './short-example.json';
import sixPotentialMisconceptionsAboutAiIntellectualsEaForumBots from './six-potential-misconceptions-about-ai-intellectuals-ea-forum-bots.json';
import slopworld2035TheDangersOfMediocreAiEaForumBots from './slopworld-2035-the-dangers-of-mediocre-ai-ea-forum-bots.json';
import stronglyBoundedAgents from './strongly-bounded-agents.json';
import threeObservations from './three-observations.json';
import whatSGoingOnWithOpenaiSMessagingLesswrong from './what-s-going-on-with-openai-s-messaging-lesswrong.json';
import whyISignedUpToThe10PledgeInTheWakeOfForeignAidCutsAndWhereYouCanDonateEaForumBots from './why-i-signed-up-to-the-10-pledge-in-the-wake-of-foreign-aid-cuts-and-where-you-can-donate-ea-forum-bots.json';
import workingInVirtualRealityAReviewLesswrong from './working-in-virtual-reality-a-review-lesswrong.json';

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [
    6PotentialMisconceptionsAboutAiIntellectualsEaForumBots,
    aCaseForSuperhumanGovernanceUsingAiLesswrong,
    aNoteOfCautionAboutRecentAiRiskCoverageEaForum,
    aSketchOfAiDrivenEpistemicLockInEaForumBots,
    aiForResolvingForecastingQuestionsAnEarlyExplorationEaForumBots,
    canWeHoldIntellectualsToSimilarPublicStandardsAsAthletesLesswrong,
    higherOrderForecastsLesswrong,
    integrityForConsequentialistsEaForum,
    myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsEaForumBots,
    myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsLesswrong,
    openCommunicationInTheDaysOfMaliciousOnlineActorsLesswrong,
    policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum,
    quriRecommendedAiEpistemicsProjects,
    scorableFunctionsAFormatForAlgorithmicForecastingLesswrong,
    shortExample,
    sixPotentialMisconceptionsAboutAiIntellectualsEaForumBots,
    slopworld2035TheDangersOfMediocreAiEaForumBots,
    stronglyBoundedAgents,
    threeObservations,
    whatSGoingOnWithOpenaiSMessagingLesswrong,
    whyISignedUpToThe10PledgeInTheWakeOfForeignAidCutsAndWhereYouCanDonateEaForumBots,
    workingInVirtualRealityAReviewLesswrong
  ],
} as RawDocumentsCollection);
