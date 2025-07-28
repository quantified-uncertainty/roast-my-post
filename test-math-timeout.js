const { checkMathHybridTool } = require('./dist/src/tools/check-math-hybrid/index.js');

async function testMathPlugin() {
  console.log('Testing math plugin with timeout fix...');
  
  const startTime = Date.now();
  
  try {
    const result = await checkMathHybridTool.execute({
      statement: "2 + 2 = 4",
      context: "Simple arithmetic test"
    }, {
      logger: {
        info: (msg) => console.log(`[INFO] ${msg}`),
        error: (msg, err) => console.log(`[ERROR] ${msg}`, err),
        warn: (msg) => console.log(`[WARN] ${msg}`)
      }
    });
    
    const duration = Date.now() - startTime;
    console.log(`✅ Math plugin completed in ${duration}ms`);
    console.log('Result:', result.status, '-', result.explanation);
    
  } catch (error) {
    const duration = Date.now() - startTime;
    console.log(`❌ Math plugin failed after ${duration}ms:`, error.message);
  }
}

testMathPlugin();