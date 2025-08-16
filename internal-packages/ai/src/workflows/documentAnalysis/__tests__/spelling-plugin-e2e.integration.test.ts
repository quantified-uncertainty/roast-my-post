import { describe, test, expect, beforeAll, afterAll } from '@jest/globals';
import { prisma } from '@roast/db';
import { analyzeDocument } from '../analyzeDocument';
import type { Agent, Document } from '@roast/ai';
import { PluginType } from '../../../analysis-plugins/types/plugin-types';

describe('Spelling Plugin E2E Integration Test', () => {
  let testUserId: string;
  let testDocumentId: string;
  let testAgentId: string;
  
  beforeAll(async () => {
    // Create a test user
    const user = await prisma.user.create({
      data: {
        email: 'test-spelling-e2e@example.com',
        name: 'Test User for Spelling E2E'
      }
    });
    testUserId = user.id;
    
    // Create test document with known spelling/grammar errors
    const document = await prisma.document.create({
      data: {
        id: `test-spelling-${Date.now()}`,
        publishedDate: new Date(),
        submittedBy: { connect: { id: testUserId } },
        versions: {
          create: {
            title: 'Document with Spelling Errors',
            content: `# Test Document for Spelling Plugin

This documnet contains varios speling and grammer errors for testing pourposes.

## Common Misspellings Section

Their are many common misspellings that ocur frequently in writting. For exmaple:
- Recieve instead of receive
- Seperate instead of separate  
- Definately instead of definitely
- Occassionally instead of occasionally

## Grammar Issues Section

Me and my friend went to the store yesterday. We seen alot of interesting things.

The data are showing that performance have improved signifcantly over time.

## Punctuation Problems

This sentence doesnt have an apostrophe where it should have one.

Heres another issue no comma before "and" no period at the end

## Mixed Issues

Its important too note that thier are multiple issue's in this sentance, including speling, grammer, and punctuation errors that needs to be catched by the plugin.

The companys performance have been effected by various factor's including:
- Poor managment decisisons
- Insufficent fundig
- Lack of employe engagement

## Conclusion

In concluson, this document deliberatly contains many errors to test wether the spelling and grammer checker can accuratly identify and report them with proper highlight positions.`,
            authors: ['Test Author'],
            urls: [],
            platforms: [],
            intendedAgents: [],
            version: 1
          }
        }
      }
    });
    testDocumentId = document.id;
    
    // Create test agent with spelling plugin
    const agent = await prisma.agent.create({
      data: {
        id: `test-spelling-agent-${Date.now()}`,
        submittedBy: { connect: { id: testUserId } },
        versions: {
          create: {
            name: 'Test Spelling Agent',
            description: 'Agent for testing spelling plugin integration',
            providesGrades: false,
            pluginIds: [PluginType.SPELLING],
            version: 1
          }
        }
      }
    });
    testAgentId = agent.id;
  });
  
  afterAll(async () => {
    // Clean up test data
    if (testDocumentId) {
      await prisma.document.delete({ where: { id: testDocumentId } }).catch(() => {});
    }
    if (testAgentId) {
      await prisma.agent.delete({ where: { id: testAgentId } }).catch(() => {});
    }
    if (testUserId) {
      await prisma.user.delete({ where: { id: testUserId } }).catch(() => {});
    }
    await prisma.$disconnect();
  });
  
  test('should detect spelling and grammar errors and create comments with correct highlights', async () => {
    // Get the document and agent for analysis
    const documentVersion = await prisma.documentVersion.findFirst({
      where: { documentId: testDocumentId },
      include: { document: true }
    });
    
    const agentVersion = await prisma.agentVersion.findFirst({
      where: { agentId: testAgentId }
    });
    
    expect(documentVersion).toBeTruthy();
    expect(agentVersion).toBeTruthy();
    
    // Create Document object for analysis
    const document: Document = {
      id: documentVersion!.document.id,
      slug: documentVersion!.document.id,
      title: documentVersion!.title,
      content: documentVersion!.content,
      author: documentVersion!.authors.join(', '),
      publishedDate: documentVersion!.document.publishedDate.toISOString(),
      url: documentVersion!.urls[0] || '',
      platforms: documentVersion!.platforms,
      reviews: [],
      intendedAgents: documentVersion!.intendedAgents
    };
    
    // Create Agent object for analysis
    const agent: Agent = {
      id: testAgentId,
      name: agentVersion!.name,
      version: agentVersion!.version.toString(),
      description: agentVersion!.description,
      providesGrades: agentVersion!.providesGrades,
      pluginIds: agentVersion!.pluginIds as PluginType[]
    };
    
    // Run the analysis
    const result = await analyzeDocument(
      document,
      agent,
      500, // targetWordCount
      10,  // targetHighlights
      `test-job-${Date.now()}`
    );
    
    // Verify the result structure
    expect(result).toHaveProperty('analysis');
    expect(result).toHaveProperty('summary');
    expect(result).toHaveProperty('highlights');
    expect(result).toHaveProperty('tasks');
    
    // Verify we got highlights (comments)
    expect(result.highlights).toBeDefined();
    expect(result.highlights.length).toBeGreaterThan(0);
    
    // Check that we detected specific known errors
    const highlights = result.highlights;
    
    // Check for specific misspellings we know are in the document
    const expectedErrors = [
      'documnet', // should be 'document'
      'varios',   // should be 'various'
      'speling',  // should be 'spelling'
      'grammer',  // should be 'grammar'
      'pourposes', // should be 'purposes'
      'ocur',     // should be 'occur'
      'writting', // should be 'writing'
      'exmaple',  // should be 'example'
      'Recieve',  // should be 'Receive'
      'Seperate', // should be 'Separate'
      'Definately', // should be 'Definitely'
      'doesnt',   // should be 'doesn\'t'
      'Heres',    // should be 'Here\'s'
      'Its',      // should be 'It\'s'
      'thier',    // should be 'their'
      'sentance', // should be 'sentence'
      'companys', // should be 'company\'s'
      'effected', // should be 'affected'
      'managment', // should be 'management'
      'decisisons', // should be 'decisions'
      'Insufficent', // should be 'Insufficient'
      'fundig',   // should be 'funding'
      'employe',  // should be 'employee'
      'concluson', // should be 'conclusion'
      'deliberatly', // should be 'deliberately'
      'wether',   // should be 'whether'
      'accuratly' // should be 'accurately'
    ];
    
    // Create a set of all quoted texts from highlights
    const detectedTexts = new Set(
      highlights
        .filter(h => h.highlight?.quotedText)
        .map(h => h.highlight!.quotedText)
    );
    
    // Count how many expected errors were detected
    const detectedExpectedErrors = expectedErrors.filter(error => {
      return Array.from(detectedTexts).some(text => 
        text.toLowerCase().includes(error.toLowerCase())
      );
    });
    
    console.log(`Detected ${detectedExpectedErrors.length} out of ${expectedErrors.length} expected errors`);
    console.log('Detected errors:', detectedExpectedErrors);
    console.log('Total highlights found:', highlights.length);
    
    // We should detect at least 70% of the expected errors
    expect(detectedExpectedErrors.length).toBeGreaterThanOrEqual(expectedErrors.length * 0.7);
    
    // Verify highlight structure
    highlights.forEach(highlight => {
      expect(highlight).toHaveProperty('description');
      expect(highlight).toHaveProperty('highlight');
      if (highlight.highlight) {
        expect(highlight.highlight).toHaveProperty('startOffset');
        expect(highlight.highlight).toHaveProperty('endOffset');
        expect(highlight.highlight).toHaveProperty('quotedText');
        
        // Verify offsets are valid
        expect(highlight.highlight.startOffset).toBeGreaterThanOrEqual(0);
        expect(highlight.highlight.endOffset).toBeGreaterThan(highlight.highlight.startOffset);
        
        // Verify quoted text matches the document content at the specified offsets
        const extractedText = document.content.substring(
          highlight.highlight.startOffset!,
          highlight.highlight.endOffset!
        );
        expect(extractedText).toBe(highlight.highlight.quotedText);
      }
    });
    
    // Verify the analysis mentions it's from the spelling plugin
    expect(result.analysis.toLowerCase()).toContain('spelling');
    
    // Verify we have task tracking
    expect(result.tasks.length).toBeGreaterThan(0);
    expect(result.tasks[0]).toHaveProperty('name');
    expect(result.tasks[0]).toHaveProperty('priceInDollars');
    expect(result.tasks[0]).toHaveProperty('timeInSeconds');
  }, 60000); // 60 second timeout for this test
  
  test('should create evaluation and save comments to database', async () => {
    // Create an evaluation
    const evaluation = await prisma.evaluation.create({
      data: {
        documentId: testDocumentId,
        agentId: testAgentId
      }
    });
    
    // Create a job for this evaluation
    const job = await prisma.job.create({
      data: {
        evaluationId: evaluation.id,
        status: 'PENDING'
      }
    });
    
    // Get the document and agent for analysis
    const documentVersion = await prisma.documentVersion.findFirst({
      where: { documentId: testDocumentId }
    });
    
    const agentVersion = await prisma.agentVersion.findFirst({
      where: { agentId: testAgentId }
    });
    
    // Create Document and Agent objects
    const document: Document = {
      id: documentVersion!.document.id,
      slug: documentVersion!.document.id,
      title: documentVersion!.title,
      content: documentVersion!.fullContent, // Use fullContent for proper offset calculation
      author: documentVersion!.authors.join(', '),
      publishedDate: new Date().toISOString(),
      url: '',
      platforms: [],
      reviews: [],
      intendedAgents: []
    };
    
    const agent: Agent = {
      id: testAgentId,
      name: agentVersion!.name,
      version: agentVersion!.version.toString(),
      description: agentVersion!.description,
      providesGrades: agentVersion!.providesGrades,
      pluginIds: agentVersion!.pluginIds as PluginType[]
    };
    
    // Run the analysis
    const result = await analyzeDocument(
      document,
      agent,
      500,
      10,
      job.id
    );
    
    // Save the results as would happen in JobOrchestrator
    const evaluationVersion = await prisma.evaluationVersion.create({
      data: {
        agentId: testAgentId,
        version: 1,
        summary: result.summary,
        analysis: result.analysis,
        grade: result.grade,
        selfCritique: result.selfCritique,
        agentVersionId: agentVersion!.id,
        evaluationId: evaluation.id,
        documentVersionId: documentVersion!.id,
        jobId: job.id
      }
    });
    
    // Save highlights/comments
    for (const comment of result.highlights) {
      if (comment.highlight) {
        // Create highlight
        const highlight = await prisma.evaluationHighlight.create({
          data: {
            startOffset: comment.highlight.startOffset!,
            endOffset: comment.highlight.endOffset!,
            quotedText: comment.highlight.quotedText,
            prefix: comment.highlight.prefix || null,
            isValid: true,
            error: null
          }
        });
        
        // Create comment linked to highlight
        await prisma.evaluationComment.create({
          data: {
            description: comment.description || 'No description',
            importance: comment.importance || null,
            grade: comment.grade || null,
            header: comment.header || null,
            level: comment.level || null,
            source: comment.source || null,
            metadata: comment.metadata || {},
            evaluationVersionId: evaluationVersion.id,
            highlightId: highlight.id
          }
        });
      }
    }
    
    // Verify the data was saved correctly
    const savedComments = await prisma.evaluationComment.findMany({
      where: { evaluationVersionId: evaluationVersion.id },
      include: { highlight: true }
    });
    
    expect(savedComments.length).toBe(result.highlights.filter(h => h.highlight).length);
    
    // Verify each comment has a valid highlight
    savedComments.forEach(comment => {
      expect(comment.highlight).toBeTruthy();
      expect(comment.highlight!.startOffset).toBeGreaterThanOrEqual(0);
      expect(comment.highlight!.endOffset).toBeGreaterThan(comment.highlight!.startOffset);
      expect(comment.highlight!.quotedText).toBeTruthy();
      expect(comment.highlight!.isValid).toBe(true);
    });
    
    // Clean up
    await prisma.evaluationComment.deleteMany({
      where: { evaluationVersionId: evaluationVersion.id }
    });
    await prisma.evaluationVersion.delete({
      where: { id: evaluationVersion.id }
    });
    await prisma.job.delete({ where: { id: job.id } });
    await prisma.evaluation.delete({ where: { id: evaluation.id } });
  }, 60000);
});