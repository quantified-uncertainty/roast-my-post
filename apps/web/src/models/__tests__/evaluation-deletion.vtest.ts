/**
 * Model tests for evaluation deletion with cascade relationships
 * Tests the database cascade deletion behavior when evaluations are deleted
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { config } from 'dotenv';
import path from 'path';

// Load the actual environment variables from .env.local
config({ path: path.resolve(__dirname, '../../../../.env.local') });

// Now import prisma after setting the correct DATABASE_URL
import { prisma, generateId } from "@roast/db";

// Skip unless database is available and accessible
const canConnectToDb = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
};

// Check if we can connect to the database
const hasDbConnection = await canConnectToDb();

// Use describe.skipIf if database is not available
const describeIfDb = describe.skipIf(!hasDbConnection);

describeIfDb("Evaluation Model - Cascade Deletion", () => {
  const testUserId = `test_user_${generateId(8)}`;
  const testAgentId = `test_agent_${generateId(8)}`;
  const testDocId = `test_doc_${generateId(8)}`;
  let testUser: any;
  let testAgent: any;
  let testDocument: any;
  let testDocumentVersion: any;
  let testAgentVersion: any;

  beforeAll(async () => {
    // Create test user
    testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@test.com`,
      },
    });

    // Create test agent
    testAgent = await prisma.agent.create({
      data: {
        id: testAgentId,
        submittedById: testUserId,
      },
    });

    // Create agent version
    testAgentVersion = await prisma.agentVersion.create({
      data: {
        agentId: testAgentId,
        version: 1,
        name: "Test Agent for Deletion",
        description: "Test agent for evaluation deletion",
        primaryInstructions: "Test instructions",
      },
    });

    // Create test document
    testDocument = await prisma.document.create({
      data: {
        id: testDocId,
        publishedDate: new Date(),
        submittedById: testUserId,
      },
    });

    // Create document version
    testDocumentVersion = await prisma.documentVersion.create({
      data: {
        documentId: testDocId,
        version: 1,
        title: "Test Document for Deletion",
        content: "This is test content for evaluation deletion testing.",
        authors: [],
        urls: [],
        platforms: [],
        intendedAgents: [],
      },
    });
  });

  afterAll(async () => {
    // Clean up test data - use deleteMany to avoid foreign key issues
    await prisma.evaluation.deleteMany({
      where: { 
        OR: [
          { documentId: testDocId },
          { agentId: testAgentId }
        ]
      },
    });
    
    await prisma.documentVersion.deleteMany({
      where: { documentId: testDocId },
    });
    
    await prisma.document.deleteMany({
      where: { id: testDocId },
    });
    
    await prisma.agentVersion.deleteMany({
      where: { agentId: testAgentId },
    });
    
    await prisma.agent.deleteMany({
      where: { id: testAgentId },
    });
    
    await prisma.user.deleteMany({
      where: { id: testUserId },
    });
    
    await prisma.$disconnect();
  });

  it("should cascade delete all related data when evaluation is deleted", async () => {
    // Create an evaluation with all related data
    const evaluationId = `test_eval_${generateId(8)}`;
    
    // Create evaluation
    const evaluation = await prisma.evaluation.create({
      data: {
        id: evaluationId,
        documentId: testDocId,
        agentId: testAgentId,
      },
    });

    // Create evaluation version
    const evalVersion = await prisma.evaluationVersion.create({
      data: {
        evaluationId: evaluationId,
        agentId: testAgentId,
        agentVersionId: testAgentVersion.id,
        documentVersionId: testDocumentVersion.id,
        version: 1,
        analysis: "Test analysis content",
        summary: "Test summary",
        grade: 85,
      },
    });

    // Create highlight first
    const highlight = await prisma.evaluationHighlight.create({
      data: {
        startOffset: 0,
        endOffset: 10,
        quotedText: "This is te",
        prefix: "",
      },
    });

    // Then create comment that references the highlight
    const comment = await prisma.evaluationComment.create({
      data: {
        evaluationVersionId: evalVersion.id,
        highlightId: highlight.id,
        description: "Test comment",
        importance: 3,
        grade: 80,
        header: "Test Header",
      },
    });

    // Create job for the evaluation
    const job = await prisma.job.create({
      data: {
        evaluationId: evaluationId,
        evaluationVersionId: evalVersion.id,
        status: "COMPLETED",
        attempts: 1,
        durationInSeconds: 10,
        priceInDollars: 0.01,
      },
    });

    // Create task for the job
    const task = await prisma.task.create({
      data: {
        jobId: job.id,
        name: "Test Task",
        modelName: "claude-3",
        timeInSeconds: 5,
        priceInDollars: 0.005,
      },
    });

    // Verify all data was created
    expect(await prisma.evaluation.findUnique({ where: { id: evaluationId } })).toBeTruthy();
    expect(await prisma.evaluationVersion.findUnique({ where: { id: evalVersion.id } })).toBeTruthy();
    expect(await prisma.evaluationComment.findUnique({ where: { id: comment.id } })).toBeTruthy();
    expect(await prisma.evaluationHighlight.findUnique({ where: { id: highlight.id } })).toBeTruthy();
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toBeTruthy();
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeTruthy();

    // Now delete the evaluation - should cascade delete everything
    await prisma.evaluation.delete({
      where: { id: evaluationId },
    });

    // Verify all related data was deleted (cascade deletion)
    expect(await prisma.evaluation.findUnique({ where: { id: evaluationId } })).toBeNull();
    expect(await prisma.evaluationVersion.findUnique({ where: { id: evalVersion.id } })).toBeNull();
    expect(await prisma.evaluationComment.findUnique({ where: { id: comment.id } })).toBeNull();
    expect(await prisma.job.findUnique({ where: { id: job.id } })).toBeNull();
    expect(await prisma.task.findUnique({ where: { id: task.id } })).toBeNull();
    
    // Note: EvaluationHighlight is NOT automatically deleted because the FK relationship 
    // is FROM Comment TO Highlight (Comment references Highlight), not the other way around.
    // This is expected behavior - highlights remain as orphaned records.
    // In practice, this is fine as highlights are always accessed through comments.
    expect(await prisma.evaluationHighlight.findUnique({ where: { id: highlight.id } })).toBeTruthy();

    // Verify document and agent still exist (they should not be deleted)
    expect(await prisma.document.findUnique({ where: { id: testDocId } })).toBeTruthy();
    expect(await prisma.agent.findUnique({ where: { id: testAgentId } })).toBeTruthy();
  });

  it("should handle deletion of evaluation with multiple versions", async () => {
    const evaluationId = `test_eval_multi_${generateId(8)}`;
    
    // Create evaluation
    const evaluation = await prisma.evaluation.create({
      data: {
        id: evaluationId,
        documentId: testDocId,
        agentId: testAgentId,
      },
    });

    // Create multiple evaluation versions
    const version1 = await prisma.evaluationVersion.create({
      data: {
        evaluationId: evaluationId,
        agentId: testAgentId,
        agentVersionId: testAgentVersion.id,
        documentVersionId: testDocumentVersion.id,
        version: 1,
        analysis: "Version 1 analysis",
        summary: "Version 1 summary",
        grade: 75,
      },
    });

    const version2 = await prisma.evaluationVersion.create({
      data: {
        evaluationId: evaluationId,
        agentId: testAgentId,
        agentVersionId: testAgentVersion.id,
        documentVersionId: testDocumentVersion.id,
        version: 2,
        analysis: "Version 2 analysis",
        summary: "Version 2 summary",
        grade: 85,
        isStale: false,
      },
    });

    // Create jobs for each version
    const job1 = await prisma.job.create({
      data: {
        evaluationId: evaluationId,
        evaluationVersionId: version1.id,
        status: "COMPLETED",
      },
    });

    const job2 = await prisma.job.create({
      data: {
        evaluationId: evaluationId,
        evaluationVersionId: version2.id,
        status: "COMPLETED",
      },
    });

    // Verify all versions exist
    expect(await prisma.evaluationVersion.count({ where: { evaluationId } })).toBe(2);
    expect(await prisma.job.count({ where: { evaluationId } })).toBe(2);

    // Delete the evaluation
    await prisma.evaluation.delete({
      where: { id: evaluationId },
    });

    // Verify all versions and jobs were deleted
    expect(await prisma.evaluationVersion.count({ where: { evaluationId } })).toBe(0);
    expect(await prisma.job.count({ where: { evaluationId } })).toBe(0);
  });

  it("should not affect other evaluations when deleting one", async () => {
    const evalId1 = `test_eval_1_${generateId(8)}`;
    const evalId2 = `test_eval_2_${generateId(8)}`;
    
    // Create two evaluations for the same document
    const eval1 = await prisma.evaluation.create({
      data: {
        id: evalId1,
        documentId: testDocId,
        agentId: testAgentId,
      },
    });

    const eval2 = await prisma.evaluation.create({
      data: {
        id: evalId2,
        documentId: testDocId,
        agentId: testAgentId,
      },
    });

    // Create versions for each
    const version1 = await prisma.evaluationVersion.create({
      data: {
        evaluationId: evalId1,
        agentId: testAgentId,
        agentVersionId: testAgentVersion.id,
        documentVersionId: testDocumentVersion.id,
        version: 1,
        analysis: "Eval 1 analysis",
      },
    });

    const version2 = await prisma.evaluationVersion.create({
      data: {
        evaluationId: evalId2,
        agentId: testAgentId,
        agentVersionId: testAgentVersion.id,
        documentVersionId: testDocumentVersion.id,
        version: 1,
        analysis: "Eval 2 analysis",
      },
    });

    // Delete the first evaluation
    await prisma.evaluation.delete({
      where: { id: evalId1 },
    });

    // Verify first evaluation and its version are deleted
    expect(await prisma.evaluation.findUnique({ where: { id: evalId1 } })).toBeNull();
    expect(await prisma.evaluationVersion.findUnique({ where: { id: version1.id } })).toBeNull();

    // Verify second evaluation and its version still exist
    expect(await prisma.evaluation.findUnique({ where: { id: evalId2 } })).toBeTruthy();
    expect(await prisma.evaluationVersion.findUnique({ where: { id: version2.id } })).toBeTruthy();

    // Clean up
    await prisma.evaluation.delete({
      where: { id: evalId2 },
    });
  });
});