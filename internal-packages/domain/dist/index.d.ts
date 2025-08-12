// Manual declaration file for @roast/domain package

export declare const config: {
  database: {
    url: string;
  };
  env: {
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
    nodeEnv: string;
  };
  ai: {
    anthropicApiKey: string | undefined;
    openaiApiKey: string | undefined;
    heliconeApiKey: string | undefined;
    openRouterApiKey: string | undefined;
    heliconeEnabled: boolean;
    heliconeMaxAge: number;
    heliconeBucketMaxSize: number;
    searchModel: string;
    analysisModel: string;
  };
  auth: {
    secret: string;
    nextauthUrl: string;
  };
  server: {
    port: number;
    host: string;
  };
  features: {
    debugLogging: boolean;
    dockerBuildMode: boolean;
    dockerBuild: boolean;
    testDebug: boolean;
  };
  jobs: {
    adaptiveWorkers: {
      minWorkers: number;
      maxWorkers: number;
      scaleUpThreshold: number;
      scaleDownThreshold: number;
      pollIntervalMs: number;
      workerTimeoutMs: number;
      killGracePeriodMs: number;
      shutdownTimeoutMs: number;
      staleJobCheckIntervalMs: number;
      staleJobTimeoutMs: number;
    };
  };
};

// Export essential types used by web app
export interface Logger {
  info(message: string, meta?: any): void;
  error(message: string, meta?: any): void;
  warn(message: string, meta?: any): void;
  debug(message: string, meta?: any): void;
}

export type Result<T> = {
  success: true;
  data: T;
} | {
  success: false;
  error: string;
};

// Re-export other domain types as needed
export * from './core/config';
export * from './core/environment';
export * from './core/errors';
export * from './core/logger';
export * from './core/result';
export * from './entities';
export * from './services';
export * from './validators';