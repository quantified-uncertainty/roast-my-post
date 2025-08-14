import * as dotenv from "dotenv";
import * as path from "path";

/**
 * Base runner class that handles common environment setup for evaluation tools
 */
export abstract class BaseRunner {
  protected runnerName: string;

  constructor(runnerName: string) {
    this.runnerName = runnerName;
    this.loadEnvironmentVariables();
  }

  /**
   * Loads environment variables from multiple possible paths
   */
  private loadEnvironmentVariables(): void {
    const envPaths = [
      path.join(process.cwd(), ".env.local"),
      path.join(process.cwd(), "..", ".env.local"),
      path.join(process.cwd(), "..", "..", ".env.local"),
      path.join(__dirname, "..", "..", "..", ".env.local"),
      path.join(__dirname, "..", "..", "..", "..", ".env.local"),
      path.join(process.cwd(), ".env"),
      path.join(process.cwd(), "..", ".env"),
      path.join(process.cwd(), "..", "..", ".env"),
      path.join(__dirname, "..", "..", "..", ".env"),
      path.join(__dirname, "..", "..", "..", "..", ".env"),
    ];

    let envLoaded = false;
    for (const envPath of envPaths) {
      const result = dotenv.config({ path: envPath });
      if (!result.error) {
        console.log(`[${this.runnerName}] Loaded .env from: ${envPath}`);
        envLoaded = true;
        break;
      }
    }

    if (!envLoaded) {
      console.warn(
        `[${this.runnerName}] Warning: Could not load .env file from any of the expected paths`
      );
    }

    this.validateApiKey();
  }

  /**
   * Validates that the required API key is present
   */
  private validateApiKey(): void {
    if (!process.env.ANTHROPIC_API_KEY) {
      console.warn(`[${this.runnerName}] Warning: ANTHROPIC_API_KEY not found in environment`);
    } else {
      console.log(`[${this.runnerName}] ANTHROPIC_API_KEY loaded successfully`);
    }
  }
}