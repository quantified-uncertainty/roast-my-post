/**
 * Next.js Instrumentation
 * This file runs once when the Next.js server starts
 * Perfect place for startup validation
 */

export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    // Only run on server, not during build or edge runtime
    const { runStartupValidation } = await import('./lib/startup-validation');
    
    console.log('🚀 Starting RoastMyPost application...');
    
    try {
      const validation = runStartupValidation();
      
      // You could also report this to monitoring service
      if (!validation.isValid || validation.warnings.length > 0) {
        // Could send to Sentry, DataDog, etc.
        console.log('📊 Validation summary:', {
          required_missing: validation.missingRequired.length,
          optional_missing: validation.missingOptional.length,
          errors: validation.errors.length,
          warnings: validation.warnings.length,
        });
      }
    } catch (error) {
      console.error('💥 Startup validation failed:', error);
      // In production, this will prevent the server from starting
      if (process.env.NODE_ENV === 'production') {
        process.exit(1);
      }
    }
  }
}