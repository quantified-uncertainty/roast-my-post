/**
 * Startup validation for required services and configurations
 * This runs when the application starts to fail-fast on missing requirements
 */

export interface ServiceRequirement {
  name: string;
  envVar: string;
  required: boolean;
  feature: string;
  validateValue?: (value: string) => boolean;
}

const SERVICE_REQUIREMENTS: ServiceRequirement[] = [
  {
    name: "Anthropic API",
    envVar: "ANTHROPIC_API_KEY",
    required: true,
    feature: "Core AI evaluation functionality",
    validateValue: (value) => value.startsWith('sk-ant-api03-'),
  },
  {
    name: "Database",
    envVar: "DATABASE_URL",
    required: true,
    feature: "Data persistence",
    validateValue: (value) => value.startsWith('postgresql://'),
  },
  {
    name: "OpenRouter/Perplexity",
    envVar: "OPENROUTER_API_KEY",
    required: false, // Set to true if you want fact-checking to be mandatory
    feature: "Web-enhanced fact checking",
    validateValue: (value) => 
      value !== 'your_openrouter_api_key_here' && 
      value !== 'dummy-key-for-ci',
  },
  {
    name: "Authentication Secret",
    envVar: "AUTH_SECRET",
    required: true,
    feature: "User authentication",
    validateValue: (value) => 
      value !== 'development-secret-change-in-production' &&
      value.length >= 32,
  },
];

export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  missingRequired: string[];
  missingOptional: string[];
}

export function validateStartupConfig(): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const missingRequired: string[] = [];
  const missingOptional: string[] = [];

  for (const requirement of SERVICE_REQUIREMENTS) {
    const value = process.env[requirement.envVar];
    
    if (!value) {
      if (requirement.required) {
        errors.push(`Missing required ${requirement.name}: ${requirement.envVar} is not set. This is needed for: ${requirement.feature}`);
        missingRequired.push(requirement.envVar);
      } else {
        warnings.push(`Missing optional ${requirement.name}: ${requirement.envVar} is not set. Feature disabled: ${requirement.feature}`);
        missingOptional.push(requirement.envVar);
      }
      continue;
    }

    if (requirement.validateValue && !requirement.validateValue(value)) {
      if (requirement.required) {
        errors.push(`Invalid ${requirement.name}: ${requirement.envVar} appears to be a placeholder or invalid. Required for: ${requirement.feature}`);
      } else {
        warnings.push(`Invalid ${requirement.name}: ${requirement.envVar} appears to be a placeholder. Feature disabled: ${requirement.feature}`);
      }
    }
  }

  // Additional cross-service validations
  if (process.env.NODE_ENV === 'production') {
    if (process.env.AUTH_SECRET === 'development-secret-change-in-production') {
      errors.push('CRITICAL: Using development AUTH_SECRET in production!');
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    missingRequired,
    missingOptional,
  };
}

/**
 * Run startup validation and handle the results
 * Call this from your app initialization
 */
export function runStartupValidation() {
  const result = validateStartupConfig();
  
  if (!result.isValid) {
    console.error('🚨 Application startup validation failed:');
    result.errors.forEach(error => console.error(`  ❌ ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast
      throw new Error(`Application cannot start: Missing required configuration:\n${result.errors.join('\n')}`);
    } else {
      // In development, show warnings but continue
      console.warn('⚠️  Running in development mode with missing configuration');
    }
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }
  
  // Log successful validation
  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ All required services configured correctly');
  }
  
  return result;
}

/**
 * Check if a specific feature is available
 */
export function isFeatureAvailable(feature: 'web-search' | 'analytics' | 'email'): boolean {
  switch (feature) {
    case 'web-search':
      const openRouterKey = process.env.OPENROUTER_API_KEY;
      return !!(openRouterKey && 
        openRouterKey !== 'your_openrouter_api_key_here' && 
        openRouterKey !== 'dummy-key-for-ci');
    
    case 'analytics':
      return !!process.env.HELICONE_API_KEY;
    
    case 'email':
      return !!process.env.RESEND_API_KEY;
    
    default:
      return false;
  }
}