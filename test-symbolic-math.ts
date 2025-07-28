import { checkMathAgenticTool } from './src/tools/check-math-agentic';

async function testSymbolic() {
  const mockContext = {
    logger: {
      info: (msg: string) => console.log(`[INFO] ${msg}`),
      error: (msg: string, err?: any) => console.error(`[ERROR] ${msg}`, err),
      warn: (msg: string) => console.warn(`[WARN] ${msg}`),
      debug: (msg: string) => console.log(`[DEBUG] ${msg}`)
    }
  };
  
  const result = await checkMathAgenticTool.execute({
    statement: "The derivative of x³ is 3x²"
  }, mockContext as any);
  
  console.log('Result:', JSON.stringify(result, null, 2));
}

testSymbolic().catch(console.error);
