#!/usr/bin/env tsx

/**
 * CLI tool to manage system pause status
 *
 * Usage:
 *   pnpm run system:pause "Reason for pausing"
 *   pnpm run system:unpause
 *   pnpm run system:status
 */

import { prisma } from '../src/client';
import {
  getActivePause,
  createSystemPause,
  endActivePauses,
  isSystemPaused
} from '../src/utils/system-pause-utils';

const COLORS = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  gray: '\x1b[90m',
};

function printBanner(message: string, color: string) {
  console.log(`\n${color}${'='.repeat(60)}${COLORS.reset}`);
  console.log(`${color}${message}${COLORS.reset}`);
  console.log(`${color}${'='.repeat(60)}${COLORS.reset}\n`);
}

async function showStatus() {
  const isPaused = await isSystemPaused();
  const activePause = await getActivePause();

  if (isPaused && activePause) {
    printBanner('🔴 SYSTEM IS PAUSED', COLORS.red);
    console.log(`${COLORS.yellow}Reason:${COLORS.reset} ${activePause.reason}`);
    console.log(`${COLORS.gray}Started:${COLORS.reset} ${activePause.startedAt.toLocaleString()}`);
    console.log(`${COLORS.gray}Duration:${COLORS.reset} ${getTimeSince(activePause.startedAt)}\n`);
  } else {
    printBanner('✅ SYSTEM IS RUNNING', COLORS.green);
    console.log('All API operations are enabled.\n');
  }
}

async function pauseSystem(reason: string) {
  const isPaused = await isSystemPaused();

  if (isPaused) {
    const activePause = await getActivePause();
    printBanner('⚠️  SYSTEM ALREADY PAUSED', COLORS.yellow);
    console.log(`${COLORS.gray}Current reason:${COLORS.reset} ${activePause?.reason}`);
    console.log(`${COLORS.gray}Started:${COLORS.reset} ${activePause?.startedAt.toLocaleString()}`);
    console.log(`\n${COLORS.blue}Tip:${COLORS.reset} Run 'pnpm run system:unpause' first if you want to change the reason.\n`);
    return;
  }

  const pause = await createSystemPause(reason);
  printBanner('🔴 SYSTEM PAUSED', COLORS.red);
  console.log(`${COLORS.yellow}Reason:${COLORS.reset} ${pause.reason}`);
  console.log(`${COLORS.gray}Started:${COLORS.reset} ${pause.startedAt.toLocaleString()}`);
  console.log(`${COLORS.gray}ID:${COLORS.reset} ${pause.id}\n`);

  console.log(`${COLORS.blue}What's affected:${COLORS.reset}`);
  console.log('  ❌ New evaluations blocked');
  console.log('  ❌ New document imports blocked');
  console.log('  ❌ All LLM API calls blocked');
  console.log('  ✅ Running background jobs continue\n');

  console.log(`${COLORS.gray}To unpause:${COLORS.reset} pnpm run system:unpause\n`);
}

async function unpauseSystem() {
  const isPaused = await isSystemPaused();

  if (!isPaused) {
    printBanner('ℹ️  SYSTEM NOT PAUSED', COLORS.blue);
    console.log('The system is already running. Nothing to unpause.\n');
    return;
  }

  const activePause = await getActivePause();
  const count = await endActivePauses();

  printBanner('✅ SYSTEM UNPAUSED', COLORS.green);
  console.log(`${COLORS.gray}Ended ${count} pause(s)${COLORS.reset}`);
  if (activePause) {
    console.log(`${COLORS.gray}Previous reason:${COLORS.reset} ${activePause.reason}`);
    console.log(`${COLORS.gray}Duration:${COLORS.reset} ${getTimeSince(activePause.startedAt)}`);
  }
  console.log('\nAll API operations are now enabled.\n');
}

function getTimeSince(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);

  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
}

async function main() {
  const command = process.argv[2];
  const reason = process.argv[3];

  try {
    switch (command) {
      case 'pause':
        if (!reason) {
          console.error(`${COLORS.red}Error: Reason is required for pause command${COLORS.reset}`);
          console.log(`\nUsage: pnpm run system:pause "Your reason here"\n`);
          process.exit(1);
        }
        await pauseSystem(reason);
        break;

      case 'unpause':
        await unpauseSystem();
        break;

      case 'status':
        await showStatus();
        break;

      default:
        console.log(`${COLORS.blue}System Pause Management Tool${COLORS.reset}\n`);
        console.log('Available commands:');
        console.log(`  ${COLORS.green}pnpm run system:pause "reason"${COLORS.reset}   - Pause the system`);
        console.log(`  ${COLORS.green}pnpm run system:unpause${COLORS.reset}          - Unpause the system`);
        console.log(`  ${COLORS.green}pnpm run system:status${COLORS.reset}           - Check current status\n`);
        process.exit(1);
    }
  } catch (error) {
    console.error(`\n${COLORS.red}Error:${COLORS.reset}`, error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
