import { getDocumentFullContent } from '../src/utils/documentContentHelpers';

// Create the same mock document as in the test
const mockDocument = {
  title: 'Test Document',
  url: 'https://example.com/test',
  content: 'Line 1 content\nLine 2 content\nLine 3 content\nLine 4 content\nLine 5 content'
};

console.log('=== Document Debug ===');
console.log('Original document:');
console.log('Title:', mockDocument.title);
console.log('URL:', mockDocument.url);
console.log('Content:');
console.log(mockDocument.content);
console.log('\n');

// Get the full content
const result = getDocumentFullContent(mockDocument);
const fullContent = result.content;

console.log('=== Full Content Result Object ===');
console.log(result);
console.log('\n');

// Print with line numbers
console.log('=== Full Content with Line Numbers ===');
const lines = fullContent.split('\n');
lines.forEach((line, index) => {
  console.log(`Line ${index + 1}: "${line}"`);
});

console.log('\n=== Specific Lines ===');
console.log(`Line 1: "${lines[0]}"`);
console.log(`Line 2: "${lines[1]}"`);
console.log(`Line 3: "${lines[2]}"`);

console.log('\n=== Analysis ===');
console.log(`Total lines: ${lines.length}`);
console.log(`First line is empty: ${lines[0] === ''}`);
console.log(`Second line contains title: ${lines[1]?.includes(mockDocument.title) || false}`);
console.log(`Third line contains URL: ${lines[2]?.includes(mockDocument.url) || false}`);