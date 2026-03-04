/**
 * Profile Loader for Agentic Plugin
 *
 * Loads, validates, and manages agentic profile configurations from the database.
 */

import { prisma } from "@roast/db";
import { logger } from "../../../shared/logger";
import {
  validateAgenticConfig,
  createDefaultAgenticConfig,
} from "./profile-types";
import type { AgenticProfileConfig } from "./profile-types";

const PLUGIN_TYPE = "agentic";

/**
 * Load a profile by ID
 */
export async function loadAgenticProfile(
  profileId: string
): Promise<AgenticProfileConfig> {
  const profile = await prisma.pluginProfile.findUnique({
    where: { id: profileId },
  });

  if (!profile) {
    throw new Error(`Agentic profile not found: ${profileId}`);
  }

  return validateAgenticConfig(profile.config);
}

/**
 * Load the default profile for an agent
 */
export async function loadDefaultAgenticProfile(
  agentId: string
): Promise<AgenticProfileConfig> {
  const profile = await prisma.pluginProfile.findFirst({
    where: {
      pluginType: PLUGIN_TYPE,
      agentId,
      isDefault: true,
    },
  });

  if (!profile) {
    return createDefaultAgenticConfig();
  }

  return validateAgenticConfig(profile.config);
}

/**
 * Load a profile by ID or fall back to default for agent
 */
export async function loadAgenticProfileOrDefault(
  profileId: string | undefined,
  agentId: string
): Promise<AgenticProfileConfig> {
  if (profileId) {
    try {
      return await loadAgenticProfile(profileId);
    } catch (error) {
      logger.warn(
        `Failed to load agentic profile ${profileId}, using default:`,
        error
      );
    }
  }
  return loadDefaultAgenticProfile(agentId);
}

export type { AgenticProfileConfig };
