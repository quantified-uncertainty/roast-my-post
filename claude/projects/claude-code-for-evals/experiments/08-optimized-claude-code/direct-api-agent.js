#!/usr/bin/env node

const Anthropic = require('@anthropic-ai/sdk');
const fs = require('fs');
const path = require('path');

class SmartErrorHunter {
  constructor(config) {
    this.anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY
    });
    this.inputFile = config.inputFile;
    this.workingDoc = path.join(path.dirname(this.inputFile), 'working-document.md');
    this.maxIterations = config.maxIterations || 8;
    this.totalCost = 0;
  }

  // Define tools that Claude can use
  getTools() {
    return [
      {
        name: 'read_file',
        description: 'Read a file from the filesystem',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file to read' }
          },
          required: ['path']
        }
      },
      {
        name: 'write_file',
        description: 'Write or update a file',
        input_schema: {
          type: 'object',
          properties: {
            path: { type: 'string', description: 'Path to file to write' },
            content: { type: 'string', description: 'Content to write' }
          },
          required: ['path', 'content']
        }
      },
      {
        name: 'web_search',
        description: 'Search the web for information',
        input_schema: {
          type: 'object',
          properties: {
            query: { type: 'string', description: 'Search query' }
          },
          required: ['query']
        }
      },
      {
        name: 'append_to_working_doc',
        description: 'Append new findings to the working document',
        input_schema: {
          type: 'object',
          properties: {
            content: { type: 'string', description: 'Content to append' }
          },
          required: ['content']
        }
      }
    ];
  }

  // Execute tool calls
  async executeTool(tool) {
    console.log(`🔧 Executing: ${tool.name}`);
    
    switch (tool.name) {
      case 'read_file':
        return fs.readFileSync(tool.input.path, 'utf8');
      
      case 'write_file':
        fs.writeFileSync(tool.input.path, tool.input.content);
        return 'File written successfully';
      
      case 'append_to_working_doc':
        const current = fs.existsSync(this.workingDoc) 
          ? fs.readFileSync(this.workingDoc, 'utf8') 
          : '# Error Hunting Results\n\n';
        fs.writeFileSync(this.workingDoc, current + '\n' + tool.input.content);
        return 'Content appended to working document';
      
      case 'web_search':
        // Simulate web search - in production, use real search API
        console.log(`🔍 Searching for: ${tool.input.query}`);
        return `Search results for "${tool.input.query}": [simulated results - would use real API]`;
      
      default:
        return 'Unknown tool';
    }
  }

  async runAgent() {
    console.log('🚀 Starting Smart Error Hunter (Direct API with Tools)\n');
    
    const systemPrompt = `You are an expert document analyzer tasked with finding errors in a document.

Your goal is to find 20-30 specific, actionable errors including:
- Typos and grammatical errors (quote exact text with line numbers)
- Mathematical mistakes (especially look for R vs R-squared confusion)
- Logical contradictions
- Factual errors that need verification
- Citation and reference issues

IMPORTANT: 
1. Work iteratively - start with one type of error, document it, then move to the next
2. Use the append_to_working_doc tool to build up your findings progressively
3. Use web_search when you need to verify facts
4. Be specific - always include line numbers and exact quotes
5. Continue until you've found at least 20 high-quality errors
6. Organize your findings by category in the working document

Start by reading the input document, then systematically hunt for errors.`;

    const messages = [
      {
        role: 'user',
        content: `Please analyze the document at ${this.inputFile} for errors. Build your findings iteratively in a working document.`
      }
    ];

    let iterations = 0;
    let continueAnalysis = true;

    while (continueAnalysis && iterations < this.maxIterations) {
      iterations++;
      console.log(`\n🔄 Iteration ${iterations}/${this.maxIterations}`);
      
      const response = await this.anthropic.messages.create({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        system: systemPrompt,
        messages: messages,
        tools: this.getTools(),
        tool_choice: { type: 'auto' }
      });

      // Add assistant's response to conversation
      messages.push({ role: 'assistant', content: response.content });

      // Process any tool calls
      let toolResults = [];
      for (const block of response.content) {
        if (block.type === 'tool_use') {
          const result = await this.executeTool(block);
          toolResults.push({
            tool_use_id: block.id,
            content: result
          });
        }
      }

      // If there were tool calls, send results back
      if (toolResults.length > 0) {
        messages.push({ role: 'user', content: toolResults });
      } else {
        // No tool calls means Claude is done or needs prompting
        const lastMessage = response.content[response.content.length - 1];
        if (lastMessage.type === 'text' && lastMessage.text.includes('complete')) {
          continueAnalysis = false;
        } else {
          // Prompt to continue
          messages.push({
            role: 'user',
            content: 'Continue analyzing for more errors. What category would you like to check next?'
          });
        }
      }

      // Estimate cost (rough)
      const inputTokens = JSON.stringify(messages).length / 4;
      const outputTokens = 1000;
      const cost = (inputTokens * 0.003 + outputTokens * 0.015) / 1000;
      this.totalCost += cost;
      
      console.log(`💰 Iteration cost: ~$${cost.toFixed(4)} | Total: ~$${this.totalCost.toFixed(4)}`);
    }

    console.log(`\n✅ Analysis complete!`);
    console.log(`📄 Results saved to: ${this.workingDoc}`);
    console.log(`💰 Total estimated cost: $${this.totalCost.toFixed(4)}`);
    console.log(`🔄 Iterations used: ${iterations}`);
  }
}

// Example usage
async function main() {
  const hunter = new SmartErrorHunter({
    inputFile: path.join(__dirname, 'input.md'),
    maxIterations: 8
  });
  
  await hunter.runAgent();
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}