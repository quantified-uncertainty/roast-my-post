#!/usr/bin/env node

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);

async function test() {
    console.log("Testing Node.js timeout behavior...");
    
    // Test 1: Quick command
    console.log("\n1. Quick command (should work):");
    try {
        const { stdout } = await execAsync('echo "quick test"', {
            timeout: 5000
        });
        console.log("Success:", stdout.trim());
    } catch (e) {
        console.log("Error:", e.message);
    }
    
    // Test 2: Command that times out
    console.log("\n2. Sleep command (should timeout):");
    try {
        const { stdout } = await execAsync('sleep 10', {
            timeout: 2000
        });
        console.log("Success:", stdout);
    } catch (e) {
        console.log("Error:", e.message);
        console.log("Killed:", e.killed);
        console.log("Code:", e.code);
    }
    
    // Test 3: Claude command with Node.js timeout
    console.log("\n3. Claude command with Node timeout:");
    try {
        const { stdout } = await execAsync('echo "2+2?" | claude --print', {
            timeout: 10000,  // 10 seconds
            maxBuffer: 10 * 1024 * 1024
        });
        console.log("Success:", stdout.trim());
    } catch (e) {
        console.log("Error:", e.message);
        console.log("Signal:", e.signal);
        console.log("Stderr:", e.stderr);
    }
}

test().catch(console.error);