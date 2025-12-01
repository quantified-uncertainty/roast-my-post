/**
 * Client-safe prompt generation for claim evaluator
 * Re-exports the prompt generator without server dependencies
 */

export { generateClaimEvaluatorPrompt, DEFAULT_EXPLANATION_LENGTH, DEFAULT_PROMPT_TEMPLATE } from "./prompt";
