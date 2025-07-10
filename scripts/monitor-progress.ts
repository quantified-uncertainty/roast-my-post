#!/usr/bin/env tsx
import fs from 'fs/promises';

interface ProgressState {
  iteration: number;
  bestScore: number;
  history: { iteration: number; score: number; action: string }[];
  startTime: number;
  lastUpdate: number;
}

async function monitorProgress(progressFile: string = './agent-improvement-progress.json') {
  try {
    const content = await fs.readFile(progressFile, 'utf-8');
    const state: ProgressState = JSON.parse(content);
    
    const elapsed = (Date.now() - state.startTime) / 1000 / 60; // minutes
    const lastUpdateAgo = (Date.now() - state.lastUpdate) / 1000; // seconds
    
    console.log('🤖 Agent Improvement Progress');
    console.log('=' .repeat(40));
    console.log(`📊 Current Iteration: ${state.iteration}`);
    console.log(`🏆 Best Score: ${state.bestScore.toFixed(3)}`);
    console.log(`⏱️  Runtime: ${elapsed.toFixed(1)} minutes`);
    console.log(`🔄 Last Update: ${lastUpdateAgo.toFixed(0)} seconds ago`);
    
    if (state.history.length > 0) {
      console.log('\n📈 Recent History:');
      state.history.slice(-5).forEach(h => {
        console.log(`  Iter ${h.iteration}: ${h.score.toFixed(3)} → ${h.action}`);
      });
      
      // Show trend
      if (state.history.length >= 2) {
        const trend = state.history.slice(-2);
        const change = trend[1].score - trend[0].score;
        const trendEmoji = change > 0 ? '📈' : change < 0 ? '📉' : '➡️';
        console.log(`\n${trendEmoji} Trend: ${change > 0 ? '+' : ''}${change.toFixed(3)}`);
      }
    }
    
    console.log(`\n💾 Progress file: ${progressFile}`);
    
  } catch (error) {
    console.error('❌ No progress file found or invalid format');
    console.log('💡 Start the improvement process first');
  }
}

// Command line usage
const progressFile = process.argv[2] || './agent-improvement-progress.json';
monitorProgress(progressFile);