#!/usr/bin/env node
/**
 * Meta-Evaluation CLI Entry Point
 */

import "dotenv/config";
import React from "react";
import { render } from "ink";
import { App } from "./app";
import { metaEvaluationRepository } from "@roast/db";

// Check environment
if (!process.env.DATABASE_URL) {
  console.error("\n❌ DATABASE_URL environment variable is required.\n");
  console.error("Please either:");
  console.error("  1. Create a .env file in meta-evals/ with DATABASE_URL=...");
  console.error("  2. Or copy from apps/web/.env.local\n");
  process.exit(1);
}

// Non-interactive check mode for CI/development
if (process.argv.includes("--check")) {
  runCheckMode().catch((e) => {
    console.error("Check mode failed:", e);
    process.exit(1);
  });
} else {
  // Start the ink app in fullscreen mode
  const { waitUntilExit } = render(<App />, {
    exitOnCtrlC: true,
  });
  waitUntilExit()
    .then(() => {
      metaEvaluationRepository.disconnect();
      process.exit(0);
    })
    .catch((e) => {
      console.error("Fatal error:", e);
      metaEvaluationRepository.disconnect();
      process.exit(1);
    });
}

async function runCheckMode() {
  console.log("🔬 Meta-Evaluation Tool - Check Mode\n");

  console.log("✓ Imports loaded successfully");

  const connected = await metaEvaluationRepository.checkConnection();
  if (!connected) {
    console.error("✗ Database connection failed");
    process.exit(1);
  }
  console.log("✓ Database connection successful");

  try {
    const count = await metaEvaluationRepository.getMetaEvaluationCount();
    console.log(`✓ MetaEvaluation table exists (${count} records)`);
  } catch (error) {
    console.error("✗ MetaEvaluation table check failed:", error);
    process.exit(1);
  }

  console.log("\n✅ All checks passed!\n");
  await metaEvaluationRepository.disconnect();
}
