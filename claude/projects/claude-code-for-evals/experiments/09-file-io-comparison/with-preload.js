#!/usr/bin/env node

import Anthropic from '@anthropic-ai/sdk';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Load .env from project root
dotenv.config({ path: path.join(__dirname, '../../../../../.env') });

if (!process.env.ANTHROPIC_API_KEY) {
  console.error('ERROR: ANTHROPIC_API_KEY not found in environment');
  console.error('Please set ANTHROPIC_API_KEY in your .env file');
  process.exit(1);
}


const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

// Pre-loaded content (simulating having the content already in memory)
const PRELOADED_CONTENT = `# Why the tails fall apart

[I'm unsure how much this rehashes things 'everyone knows already' - if old hat, feel free to downvote into oblivion. My other motivation for the [cross-post](http://www.thepolemicalmedic.com/2014/07/tails-come-apart/) is the hope it might catch the interest of someone with a stronger mathematical background who could make this line of argument more robust]

[Edit 2014/11/14: mainly adjustments and rewording in light of the many helpful comments below (thanks!). I've also added a geometric explanation.]

Many outcomes of interest have pretty good predictors. It seems that height correlates to performance in basketball (the average height in the NBA is around [6'7"](http://en.wikipedia.org/wiki/NBA_league_average_height,_weight,_age_and_playing_experience)). Faster serves in tennis improve one's likelihood of winning. IQ scores are known to predict a slew of factors, from [income](http://thesocietypages.org/socimages/2008/02/06/correlations-of-iq-with-income-and-wealth/), to chance of [being imprisoned](http://www.sagepub.com/schram/study/materials/reference/90851_04.2r.pdf), to[ lifespan](http://www.bmj.com/content/322/7290/819).

What's interesting is what happens to these relationships 'out on the tail': extreme outliers of a given predictor are seldom similarly extreme outliers on the outcome it predicts, and vice versa. Although 6'7" is very tall, it lies within a [couple of standard deviations](http://www.wolframalpha.com/input/?i=male+height+distribution) of the median US adult male height - there are many thousands of US men taller than the average NBA player, yet are not in the NBA. Although elite tennis players have very fast serves, if you look at the players serving [the fastest serves ever recorded](http://en.wikipedia.org/wiki/Fastest_recorded_tennis_serves), they aren't the very best players of their time. It is harder to look at the IQ case due to test ceilings, but again there seems to be some divergence near the top: the very highest earners tend[ to be very smart](http://infoproc.blogspot.co.uk/2009/11/if-youre-so-smart-why-arent-you-rich.html), but their intelligence is not in step with their income (their cognitive ability is around +3 to +4 SD above the mean, yet their wealth is much higher than this) (1).

The trend seems to be that even when two factors are correlated, their tails diverge: the fastest servers are good tennis players, but not the very best (and the very best players serve fast, but not the very fastest); the very richest tend to be smart, but not the very smartest (and vice versa). Why?`;

async function analyzeWithPreload() {
  console.log('Starting analysis WITH pre-loaded content...');
  const startTime = Date.now();
  
  try {
    // No file I/O needed - content is already in memory
    console.log('Content already loaded in memory (no file I/O)');
    
    // Make API call
    console.log('Calling Claude API...');
    const apiStartTime = Date.now();
    
    const response = await anthropic.messages.create({
      model: 'claude-3-5-sonnet-20241022',
      max_tokens: 2000,
      messages: [{
        role: 'user',
        content: `Please analyze this blog post for errors. Look for:
1. Mathematical or logical errors
2. Factual inaccuracies
3. Typos or grammatical issues
4. Contradictions or unclear reasoning

Here's the content:

${PRELOADED_CONTENT}`
      }]
    });
    
    const apiTime = Date.now() - apiStartTime;
    console.log(`API call completed in ${apiTime}ms`);
    
    // In a real scenario, we might process results in memory
    // For comparison, we'll just log them
    console.log('Results processed in memory (no file write)');
    
    const totalTime = Date.now() - startTime;
    
    // Summary
    console.log('\n=== TIMING SUMMARY (PRE-LOADED) ===');
    console.log(`API call: ${apiTime}ms`);
    console.log(`Total time: ${totalTime}ms`);
    console.log(`I/O overhead: 0ms (0% of total)`);
    
    // Log cost
    console.log(`\nInput tokens: ${response.usage.input_tokens}`);
    console.log(`Output tokens: ${response.usage.output_tokens}`);
    const inputCost = (response.usage.input_tokens / 1000) * 0.003;
    const outputCost = (response.usage.output_tokens / 1000) * 0.015;
    console.log(`Estimated cost: $${(inputCost + outputCost).toFixed(4)}`);
    
    // Log first 200 chars of response for verification
    console.log('\nFirst 200 chars of response:');
    console.log(response.content[0].text.substring(0, 200) + '...');
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeWithPreload();