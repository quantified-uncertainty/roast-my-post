import type { AgentConfig, VerificationResult } from './types';

export function verifyAgentConfig(config: AgentConfig): VerificationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const info: string[] = [];

  // Character length checks
  if (config.name.length < 3) {
    errors.push('Name is too short (minimum 3 characters)');
  }
  
  if (config.name.length > 100) {
    warnings.push('Name is very long (over 100 characters)');
  }

  if (config.description.length < 30) {
    errors.push('Description is too short (minimum 30 characters)');
  }

  if (config.description.length > 500) {
    warnings.push('Description is long (over 500 characters) - consider being more concise');
  }

  // Instructions checks
  if (config.primaryInstructions.length < 50) {
    errors.push('Primary instructions are too short (minimum 50 characters)');
  }

  if (config.primaryInstructions.length > 30000) {
    warnings.push('Primary instructions are very long (over 30,000 characters) - may impact performance');
  }

  // Check for common instruction patterns
  const instructionLower = config.primaryInstructions.toLowerCase();
  
  if (!instructionLower.includes('you are') && !instructionLower.includes('your role') && !instructionLower.includes('your task')) {
    warnings.push('Instructions should clearly define the agent\'s role (e.g., "You are a...")');
  }

  // Self-critique instructions
  if (config.selfCritiqueInstructions) {
    if (config.selfCritiqueInstructions.length < 20) {
      warnings.push('Self-critique instructions are very short - consider adding more detail');
    }

    if (config.selfCritiqueInstructions.length > 10000) {
      warnings.push('Self-critique instructions are very long (over 10,000 characters)');
    }

    // Check for grading instructions if providesGrades is true
    if (config.providesGrades) {
      const selfCritiqueLower = config.selfCritiqueInstructions.toLowerCase();
      if (!selfCritiqueLower.includes('score') && !selfCritiqueLower.includes('grade') && !selfCritiqueLower.includes('rating')) {
        warnings.push('Agent provides grades but self-critique instructions don\'t mention scoring/grading');
      }
    }
  } else if (config.providesGrades) {
    warnings.push('Agent provides grades but has no self-critique instructions');
  }

  // README checks
  if (config.readme) {
    if (config.readme.length < 100) {
      warnings.push('README is very short - consider adding more documentation');
    }

    // Check for markdown headers
    if (!config.readme.includes('#')) {
      info.push('README could benefit from markdown headers for better structure');
    }
  } else {
    info.push('Consider adding a README for better documentation');
  }

  // Token estimation (rough: 1 token ≈ 4 characters)
  const totalChars = config.primaryInstructions.length + 
                    (config.selfCritiqueInstructions?.length || 0) +
                    (config.readme?.length || 0);
  const estimatedTokens = Math.ceil(totalChars / 4);

  if (estimatedTokens > 15000) {
    warnings.push(`Total content is approximately ${estimatedTokens} tokens - may be expensive to run`);
  }

  info.push(`Estimated token usage: ~${estimatedTokens} tokens`);

  // Extended capability check
  if (config.extendedCapabilityId) {
    info.push(`Uses extended capability: ${config.extendedCapabilityId}`);
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    info
  };
}