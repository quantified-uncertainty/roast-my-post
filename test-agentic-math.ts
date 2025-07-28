import { checkMathAgenticTool } from './src/tools/check-math-agentic';

async function testAgenticMath() {
  console.log('🤖 Testing Agentic Math Tool\n');
  console.log('This tool uses Claude with access to MathJS tools.');
  console.log('=' .repeat(60) + '\n');
  
  const mockContext = {
    logger: {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
      warn: (msg: string) => console.warn(`[WARN] ${msg}`),
      debug: (msg: string) => console.log(`[DEBUG] ${msg}`)
    }
  };
  
  const testCases = [
    {
      name: 'Simple arithmetic',
      statement: '2 + 2 = 4'
    },
    {
      name: 'Complex expression',
      statement: 'The binomial coefficient "10 choose 3" equals 120'
    },
    {
      name: 'Unit conversion',
      statement: 'Converting 100 fahrenheit to celsius gives 37.78 degrees'
    },
    {
      name: 'Derivative (conceptual)',
      statement: 'The derivative of x³ is 3x²'
    },
    {
      name: 'Statistical claim',
      statement: '0.736 % ... So the risk of death in 2019 was 0.00202 % per person-day'
    },
    {
      name: 'Error detection',
      statement: '10% of 50 is 10'
    }
  ];
  
  for (const test of testCases) {
    console.log(`\nTest: ${test.name}`);
    console.log(`Statement: "${test.statement}"`);
    console.log('-'.repeat(60));
    
    const startTime = Date.now();
    
    try {
      const result = await checkMathAgenticTool.execute({
        statement: test.statement
      }, mockContext as any);
      
      const duration = Date.now() - startTime;
      
      console.log(`\n✅ Result: ${result.status} (${duration}ms)`);
      console.log(`Explanation: ${result.explanation}`);
      
      if (result.agentReasoning) {
        console.log(`\n📝 Agent Reasoning:`);
        console.log(result.agentReasoning);
      }
      
      if (result.toolCalls && result.toolCalls.length > 0) {
        console.log(`\n🛠️  Tool Calls:`);
        for (const call of result.toolCalls) {
          console.log(`  - ${call.tool}:`);
          console.log(`    Input: ${JSON.stringify(call.input, null, 2)}`);
          console.log(`    Output: ${JSON.stringify(call.output, null, 2).substring(0, 200)}...`);
        }
      }
      
      if (result.verificationDetails) {
        console.log(`\n📊 Verification Details:`);
        console.log(`  Expression: ${result.verificationDetails.mathJsExpression}`);
        console.log(`  Result: ${result.verificationDetails.computedValue}`);
      }
      
      if (result.errorDetails) {
        console.log(`\n❌ Error Details:`);
        console.log(`  Type: ${result.errorDetails.errorType}`);
        console.log(`  Severity: ${result.errorDetails.severity}`);
        console.log(`  Correction: ${result.errorDetails.conciseCorrection}`);
      }
      
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log(`\n❌ Error after ${duration}ms: ${error.message}`);
    }
    
    console.log('\n' + '='.repeat(60));
  }
}

testAgenticMath().catch(console.error);