import type { RawDocumentsCollection } from '@/types/documents';
import { transformDocumentsCollection } from '@/types/documents';

// Import individual documents
import aCaseForSuperhumanGovernanceUsingAiLesswrong from './a-case-for-superhuman-governance-using-ai-lesswrong.json';
import aNoteOfCautionAboutRecentAiRiskCoverageEaForum from './a-note-of-caution-about-recent-ai-risk-coverage-ea-forum.json';
import aSketchOfAiDrivenEpistemicLockInEaForumBots from './a-sketch-of-ai-driven-epistemic-lock-in-ea-forum-bots.json';
import ai2027WhatSuperintelligenceLooksLike from './ai-2027-what-superintelligence-looks-like.json';
import aiEpistemicsSummaryMeeting from './ai-epistemics-summary-meeting.json';
import aiForResolvingForecastingQuestionsAnEarlyExplorationEaForumBots from './ai-for-resolving-forecasting-questions-an-early-exploration-ea-forum-bots.json';
import aligningAiByOptimizingForWisdomLesswrong from './aligning-ai-by-optimizing-for-wisdom-lesswrong.json';
import alignmentFakingInLargeLanguageModels from './alignment-faking-in-large-language-models.json';
import boundedAiMightBeViableLesswrong from './bounded-ai-might-be-viable-lesswrong.json';
import canWeHoldIntellectualsToSimilarPublicStandardsAsAthletesLesswrong from './can-we-hold-intellectuals-to-similar-public-standards-as-athletes-lesswrong.json';
import goodhartTypologyViaStructureFunctionAndRandomnessDistributionsLesswrong from './goodhart-typology-via-structure-function-and-randomness-distributions-lesswrong.json';
import higherOrderForecastsLesswrong from './higher-order-forecasts-lesswrong.json';
import iEkIsWrongAgain from './i-ek-is-wrong-again.json';
import iThinkThatImageModelsSuchAsChatgptAreProbablyAGreatFitForCustomZoomBackgrounds from './i-think-that-image-models-such-as-chatgpt-are-probably-a-great-fit-for-custom-zoom-backgrounds.json';
import iVeBeenThinkingALotAboutHowToDoQuantitativeLlmEvaluationsOfTheValueOfVariousMo from './i-ve-been-thinking-a-lot-about-how-to-do-quantitative-llm-evaluations-of-the-value-of-various-mo.json';
import informationTheoreticBoxingOfSuperintelligencesLesswrong from './information-theoretic-boxing-of-superintelligences-lesswrong.json';
import integrityForConsequentialistsEaForum from './integrity-for-consequentialists-ea-forum.json';
import myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsEaForumBots from './my-current-claims-and-cruxes-on-llm-forecasting-epistemics-ea-forum-bots.json';
import policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum from './policy-advocacy-for-eradicating-screwworm-looks-remarkably-cost-effective-ea-forum.json';
import productInTheAgeOfAi from './product-in-the-age-of-ai.json';
import scorableFunctionsAFormatForAlgorithmicForecastingLesswrong from './scorable-functions-a-format-for-algorithmic-forecasting-lesswrong.json';
import sixPotentialMisconceptionsAboutAiIntellectualsEaForumBots from './six-potential-misconceptions-about-ai-intellectuals-ea-forum-bots.json';
import slopworld2035TheDangersOfMediocreAiEaForumBots from './slopworld-2035-the-dangers-of-mediocre-ai-ea-forum-bots.json';
import stronglyBoundedAgents from './strongly-bounded-agents.json';
import theRiskRewardTradeoffOfInterpretabilityResearchLesswrong from './the-risk-reward-tradeoff-of-interpretability-research-lesswrong.json';
import thereSAMajorTensionBetweenTheAccumulationOfGenerationalWealthAndAltruism from './there-s-a-major-tension-between-the-accumulation-of-generational-wealth-and-altruism.json';
import threeGrants from './three-grants.json';
import threeObservations from './three-observations.json';
import updatingUtilityFunctionsLesswrong from './updating-utility-functions-lesswrong.json';
import whatSGoingOnWithOpenaiSMessagingLesswrong from './what-s-going-on-with-openai-s-messaging-lesswrong.json';
import whileLargeLanguageModelsLlmsHaveImportantEpistemicIssuesIGenerallyFindThemBroadly from './while-large-language-models-llms-have-important-epistemic-issues-i-generally-find-them-broadly.json';
import whyISignedUpToThe10PledgeInTheWakeOfForeignAidCutsAndWhereYouCanDonateEaForumBots from './why-i-signed-up-to-the-10-pledge-in-the-wake-of-foreign-aid-cuts-and-where-you-can-donate-ea-forum-bots.json';
import workingInVirtualRealityAReviewLesswrong from './working-in-virtual-reality-a-review-lesswrong.json';
import yourConnectedWorkspaceForWikiDocsProjectsNotion from './your-connected-workspace-for-wiki-docs-projects-notion.json';

// Transform the raw data to include Date objects
export const documentsCollection = transformDocumentsCollection({
  documents: [
    aCaseForSuperhumanGovernanceUsingAiLesswrong,
    aNoteOfCautionAboutRecentAiRiskCoverageEaForum,
    aSketchOfAiDrivenEpistemicLockInEaForumBots,
    ai2027WhatSuperintelligenceLooksLike,
    aiEpistemicsSummaryMeeting,
    aiForResolvingForecastingQuestionsAnEarlyExplorationEaForumBots,
    aligningAiByOptimizingForWisdomLesswrong,
    alignmentFakingInLargeLanguageModels,
    boundedAiMightBeViableLesswrong,
    canWeHoldIntellectualsToSimilarPublicStandardsAsAthletesLesswrong,
    goodhartTypologyViaStructureFunctionAndRandomnessDistributionsLesswrong,
    higherOrderForecastsLesswrong,
    iEkIsWrongAgain,
    iThinkThatImageModelsSuchAsChatgptAreProbablyAGreatFitForCustomZoomBackgrounds,
    iVeBeenThinkingALotAboutHowToDoQuantitativeLlmEvaluationsOfTheValueOfVariousMo,
    informationTheoreticBoxingOfSuperintelligencesLesswrong,
    integrityForConsequentialistsEaForum,
    myCurrentClaimsAndCruxesOnLlmForecastingEpistemicsEaForumBots,
    policyAdvocacyForEradicatingScrewwormLooksRemarkablyCostEffectiveEaForum,
    productInTheAgeOfAi,
    scorableFunctionsAFormatForAlgorithmicForecastingLesswrong,
    sixPotentialMisconceptionsAboutAiIntellectualsEaForumBots,
    slopworld2035TheDangersOfMediocreAiEaForumBots,
    stronglyBoundedAgents,
    theRiskRewardTradeoffOfInterpretabilityResearchLesswrong,
    thereSAMajorTensionBetweenTheAccumulationOfGenerationalWealthAndAltruism,
    threeGrants,
    threeObservations,
    updatingUtilityFunctionsLesswrong,
    whatSGoingOnWithOpenaiSMessagingLesswrong,
    whileLargeLanguageModelsLlmsHaveImportantEpistemicIssuesIGenerallyFindThemBroadly,
    whyISignedUpToThe10PledgeInTheWakeOfForeignAidCutsAndWhereYouCanDonateEaForumBots,
    workingInVirtualRealityAReviewLesswrong,
    yourConnectedWorkspaceForWikiDocsProjectsNotion
  ],
} as RawDocumentsCollection);
