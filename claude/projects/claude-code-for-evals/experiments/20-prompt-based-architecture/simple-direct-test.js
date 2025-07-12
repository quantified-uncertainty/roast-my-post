#!/usr/bin/env node

// Simple test to directly call the analyzer logic

const fs = require('fs').promises;
const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function testCallClaude() {
    console.log("Testing callClaude function...");
    
    const prompt = `What is 2+2? Just respond with the number.`;
    const timeout = 30;
    const tempFile = `/tmp/claude-prompt-${Date.now()}.txt`;
    
    console.log("Writing prompt to:", tempFile);
    await fs.writeFile(tempFile, prompt);
    
    try {
        console.log("Executing command...");
        const command = `cat ${tempFile} | timeout ${timeout} claude --print`;
        console.log("Command:", command);
        
        const { stdout, stderr } = await execAsync(command, { 
            maxBuffer: 10 * 1024 * 1024, 
            shell: '/bin/bash'
        });
        
        console.log("Success! Output:", stdout.trim());
        if (stderr) console.log("Stderr:", stderr);
        
        await fs.unlink(tempFile).catch(() => {});
        return stdout;
    } catch (error) {
        console.error("Error:", error);
        await fs.unlink(tempFile).catch(() => {});
        throw error;
    }
}

testCallClaude().catch(console.error);