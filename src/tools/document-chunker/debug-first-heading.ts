import { documentChunkerTool } from './index';

const mockContext = {
  logger: {
    info: console.log,
    error: console.error,
    warn: console.warn,
    debug: console.debug,
    log: console.log,
    logRequest: () => {},
    logResponse: () => {},
    child: () => mockContext.logger,
    isDevelopment: true,
  },
} as any;

async function debug() {
  const text = `# The Impact of Machine Learning on Climate Prediction Models

## Abstract

Climate prediction has undergone significant transformation.`;

  console.log('Input text:');
  console.log(text);
  console.log('\nText length:', text.length);
  console.log('First 50 chars:', text.substring(0, 50));
  
  const result = await documentChunkerTool.execute({ text, targetWords: 1000 }, mockContext);
  
  console.log('\nChunks:');
  result.chunks.forEach((chunk, i) => {
    console.log(`\nChunk ${i}:`);
    console.log(`  startOffset: ${chunk.startOffset}`);
    console.log(`  endOffset: ${chunk.endOffset}`);
    console.log(`  length: ${chunk.text.length}`);
    console.log(`  First 50 chars: "${chunk.text.substring(0, 50)}"`);
  });
}

debug().catch(console.error);