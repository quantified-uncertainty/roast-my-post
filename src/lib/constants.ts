// External URLs and links used throughout the application
export const EXTERNAL_URLS = {
  // Social and Community
  DISCORD: 'https://discord.gg/nsTnQTgtG6',
  GITHUB_REPO: 'https://github.com/quantified-uncertainty/roast-my-post',
  GITHUB_ISSUES: 'https://github.com/quantified-uncertainty/roast-my-post/issues',
  
  // Organization
  QURI_WEBSITE: 'https://quantifieduncertainty.org',
  
  // API Documentation Base URL
  API_BASE: process.env.NEXT_PUBLIC_API_URL || 'https://roastmypost.com/api',
} as const;

// Rate limiting constants (also defined in rate-limiter.ts)
export const RATE_LIMITS = {
  STANDARD: 60, // requests per minute
  SENSITIVE: 10, // requests per minute for sensitive operations
} as const;