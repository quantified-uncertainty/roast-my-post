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
 * Test OpenRouter API key by making a simple request
 */
async function validateOpenRouterKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'https://roastmypost.org',
        'X-Title': 'RoastMyPost Validation',
      },
    });
    
    if (response.status === 401) {
      return { valid: false, error: 'Invalid API key (401 Unauthorized)' };
    }
    
    if (response.status === 403) {
      return { valid: false, error: 'API key lacks permissions (403 Forbidden)' };
    }
    
    if (!response.ok) {
      return { valid: false, error: `API returned ${response.status}: ${response.statusText}` };
    }
    
    return { valid: true };
  } catch (error) {
    return { 
      valid: false, 
      error: `Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}` 
    };
  }
}

/**
 * Test Anthropic API key
 */
async function validateAnthropicKey(apiKey: string): Promise<{ valid: boolean; error?: string }> {
  // For Anthropic, we can't easily test without making a real API call
  // But we can at least check the format
  if (!apiKey.startsWith('sk-ant-api03-')) {
    return { valid: false, error: 'Invalid Anthropic API key format' };
  }
  // Could add a minimal API call here if needed
  return { valid: true };
}

/**
 * Run startup validation and handle the results
 * Call this from your app initialization
 */
export async function runStartupValidation() {
  const result = validateStartupConfig();
  
  // Test API keys if they exist
  const apiValidations: Promise<void>[] = [];
  
  // Test OpenRouter key if present
  const openRouterKey = process.env.OPENROUTER_API_KEY;
  if (openRouterKey && openRouterKey !== 'your_openrouter_api_key_here' && openRouterKey !== 'dummy-key-for-ci') {
    apiValidations.push(
      validateOpenRouterKey(openRouterKey).then(({ valid, error }) => {
        if (!valid) {
          const message = `OpenRouter API key validation failed: ${error}`;
          if (result.errors.indexOf(message) === -1) {
            result.errors.push(message);
          }
          result.isValid = false;
          console.error(`  ❌ ${message}`);
        } else {
          console.log('  ✅ OpenRouter API key validated successfully');
        }
      })
    );
  }
  
  // Test Anthropic key if present
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (anthropicKey && anthropicKey !== 'sk-ant-api03-xxxxx') {
    apiValidations.push(
      validateAnthropicKey(anthropicKey).then(({ valid, error }) => {
        if (!valid) {
          const message = `Anthropic API key validation failed: ${error}`;
          if (result.errors.indexOf(message) === -1) {
            result.errors.push(message);
          }
          result.isValid = false;
          console.error(`  ❌ ${message}`);
        }
      })
    );
  }
  
  // Wait for all API validations
  if (apiValidations.length > 0) {
    console.log('🔍 Validating API keys...');
    await Promise.all(apiValidations);
  }
  
  if (!result.isValid) {
    console.error('🚨 Application startup validation failed:');
    result.errors.forEach(error => console.error(`  ❌ ${error}`));
    
    if (process.env.NODE_ENV === 'production') {
      // In production, fail fast
      throw new Error(`Application cannot start: Configuration validation failed:\n${result.errors.join('\n')}`);
    } else {
      // In development, show warnings but continue
      console.warn('⚠️  Running in development mode with invalid configuration');
    }
  }
  
  if (result.warnings.length > 0) {
    console.warn('⚠️  Configuration warnings:');
    result.warnings.forEach(warning => console.warn(`  ⚠️  ${warning}`));
  }
  
  // Log successful validation
  if (result.isValid && result.warnings.length === 0) {
    console.log('✅ All required services configured and validated');
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