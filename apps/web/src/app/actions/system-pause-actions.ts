"use server";

import { getActivePause, type ActivePause } from "@roast/db";

/**
 * Server action to get the current system pause status
 * Returns null if system is not paused
 */
export async function getSystemPauseStatus(): Promise<ActivePause | null> {
  return await getActivePause();
}
