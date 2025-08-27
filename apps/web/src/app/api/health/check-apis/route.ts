import { NextResponse } from "next/server";

/**
 * Simple health check endpoint to validate API keys
 * Useful for debugging configuration issues without restarting
 */

interface ApiStatus {
  name: string;
  configured: boolean;
  valid?: boolean;
  error?: string;
}

async function checkOpenRouter(): Promise<ApiStatus> {
  const key = process.env.OPENROUTER_API_KEY;
  
  if (!key) {
    return { name: "OpenRouter", configured: false };
  }
  
  if (key === 'your_openrouter_api_key_here' || key === 'dummy-key-for-ci') {
    return { 
      name: "OpenRouter", 
      configured: true, 
      valid: false, 
      error: "Using placeholder key" 
    };
  }
  
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${key}`,
        'HTTP-Referer': 'https://roastmypost.org',
        'X-Title': 'RoastMyPost Health Check',
      },
    });
    
    if (response.status === 401) {
      return { 
        name: "OpenRouter", 
        configured: true, 
        valid: false, 
        error: "Invalid API key (401)" 
      };
    }
    
    if (!response.ok) {
      return { 
        name: "OpenRouter", 
        configured: true, 
        valid: false, 
        error: `API returned ${response.status}` 
      };
    }
    
    return { name: "OpenRouter", configured: true, valid: true };
  } catch (error) {
    return { 
      name: "OpenRouter", 
      configured: true, 
      valid: false, 
      error: error instanceof Error ? error.message : "Connection failed" 
    };
  }
}

async function checkAnthropic(): Promise<ApiStatus> {
  const key = process.env.ANTHROPIC_API_KEY;
  
  if (!key) {
    return { name: "Anthropic", configured: false };
  }
  
  if (key === 'sk-ant-api03-xxxxx' || !key.startsWith('sk-ant-')) {
    return { 
      name: "Anthropic", 
      configured: true, 
      valid: false, 
      error: "Invalid key format" 
    };
  }
  
  // Could add actual API validation here if needed
  return { name: "Anthropic", configured: true, valid: true };
}

export async function GET() {
  const [openRouter, anthropic] = await Promise.all([
    checkOpenRouter(),
    checkAnthropic(),
  ]);
  
  const apis = [openRouter, anthropic];
  const allValid = apis.every(api => api.configured && api.valid !== false);
  
  return NextResponse.json({
    status: allValid ? "healthy" : "degraded",
    apis,
    timestamp: new Date().toISOString(),
  });
}