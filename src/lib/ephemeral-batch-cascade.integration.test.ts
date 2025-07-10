/**
 * Integration test for cascade deletion of ephemeral batches
 * This test requires a real database connection
 */

import { prisma } from "./prisma";
import { nanoid } from "nanoid";

// Skip in CI unless database is available
const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb("Ephemeral Batch Cascade Deletion (Integration)", () => {
  const testUserId = `test_user_${nanoid(8)}`;
  let testUser: any;

  beforeAll(async () => {
    // Create a test user
    testUser = await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@test.com`,
      },
    });
  });

  afterAll(async () => {
    // Clean up test user (will cascade delete everything)
    await prisma.user.delete({
      where: { id: testUserId },
    });
    await prisma.$disconnect();
  });

  it("should cascade delete all ephemeral resources when batch is deleted", async () => {
    // Create an ephemeral batch with all related resources
    const batchId = `test_batch_${nanoid(8)}`;
    const agentId = `test_agent_${nanoid(8)}`;
    const docId1 = `test_doc_${nanoid(8)}`;
    const docId2 = `test_doc_${nanoid(8)}`;

    // Create ephemeral agent
    const agent = await prisma.agent.create({
      data: {
        id: agentId,
        submittedById: testUserId,
      },
    });

    // Create agent version
    const agentVersion = await prisma.agentVersion.create({
      data: {
        agentId: agentId,
        version: 1,
        name: "Test Ephemeral Agent",
        description: "Test agent for cascade deletion",
        primaryInstructions: "Test instructions",
      },
    });

    // Create ephemeral batch
    const batch = await prisma.agentEvalBatch.create({
      data: {
        id: batchId,
        agentId: agentId,
        userId: testUserId,
        isEphemeral: true,
        trackingId: `exp_${nanoid(8)}`,
        description: "Test ephemeral batch",
        expiresAt: new Date(Date.now() - 1000), // Already expired
      },
    });

    // Link agent to batch
    await prisma.agent.update({
      where: { id: agentId },
      data: { ephemeralBatchId: batchId },
    });

    // Create ephemeral documents
    const doc1 = await prisma.document.create({
      data: {
        id: docId1,
        publishedDate: new Date(),
        submittedById: testUserId,
        ephemeralBatchId: batchId,
      },
    });

    const doc2 = await prisma.document.create({
      data: {
        id: docId2,
        publishedDate: new Date(),
        submittedById: testUserId,
        ephemeralBatchId: batchId,
      },
    });

    // Create document versions
    await prisma.documentVersion.create({
      data: {
        documentId: docId1,
        version: 1,
        title: "Test Document 1",
        content: "Test content 1",
        authors: ["Test Author"],
        urls: [],
        platforms: [],
        intendedAgents: [],
      },
    });

    await prisma.documentVersion.create({
      data: {
        documentId: docId2,
        version: 1,
        title: "Test Document 2",
        content: "Test content 2",
        authors: ["Test Author"],
        urls: [],
        platforms: [],
        intendedAgents: [],
      },
    });

    // Create evaluations
    const eval1 = await prisma.evaluation.create({
      data: {
        documentId: docId1,
        agentId: agentId,
      },
    });

    // Create jobs
    const job1 = await prisma.job.create({
      data: {
        agentEvalBatchId: batchId,
        evaluationId: eval1.id,
        status: "COMPLETED",
      },
    });

    // Verify everything was created
    expect(await prisma.agentEvalBatch.findUnique({ where: { id: batchId } })).toBeTruthy();
    expect(await prisma.agent.findUnique({ where: { id: agentId } })).toBeTruthy();
    expect(await prisma.document.findUnique({ where: { id: docId1 } })).toBeTruthy();
    expect(await prisma.document.findUnique({ where: { id: docId2 } })).toBeTruthy();
    expect(await prisma.evaluation.findUnique({ where: { id: eval1.id } })).toBeTruthy();
    expect(await prisma.job.findUnique({ where: { id: job1.id } })).toBeTruthy();

    // Delete the batch - should cascade delete everything
    await prisma.$transaction(async (tx) => {
      // Delete jobs first to avoid foreign key constraint
      await tx.job.deleteMany({
        where: { agentEvalBatchId: batchId },
      });
      // Then delete the batch
      await tx.agentEvalBatch.delete({
        where: { id: batchId },
      });
    });

    // Verify everything was deleted
    expect(await prisma.agentEvalBatch.findUnique({ where: { id: batchId } })).toBeNull();
    expect(await prisma.agent.findUnique({ where: { id: agentId } })).toBeNull();
    expect(await prisma.document.findUnique({ where: { id: docId1 } })).toBeNull();
    expect(await prisma.document.findUnique({ where: { id: docId2 } })).toBeNull();
    expect(await prisma.evaluation.findUnique({ where: { id: eval1.id } })).toBeNull();
    expect(await prisma.job.findUnique({ where: { id: job1.id } })).toBeNull();

    // Verify agent version was also deleted (through agent cascade)
    expect(await prisma.agentVersion.findUnique({ where: { id: agentVersion.id } })).toBeNull();
  });

  it("should not delete non-ephemeral resources", async () => {
    // Create a regular (non-ephemeral) agent
    const regularAgentId = `regular_agent_${nanoid(8)}`;
    const regularAgent = await prisma.agent.create({
      data: {
        id: regularAgentId,
        submittedById: testUserId,
      },
    });

    // Create a regular document
    const regularDocId = `regular_doc_${nanoid(8)}`;
    const regularDoc = await prisma.document.create({
      data: {
        id: regularDocId,
        publishedDate: new Date(),
        submittedById: testUserId,
        // No ephemeralBatchId - this is a regular document
      },
    });

    // Create an ephemeral batch that uses the regular agent
    const batchId = `test_batch2_${nanoid(8)}`;
    const batch = await prisma.agentEvalBatch.create({
      data: {
        id: batchId,
        agentId: regularAgentId, // Using regular agent
        userId: testUserId,
        isEphemeral: true,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    // Delete the ephemeral batch
    await prisma.$transaction(async (tx) => {
      // Delete jobs first if any
      await tx.job.deleteMany({
        where: { agentEvalBatchId: batchId },
      });
      // Then delete the batch
      await tx.agentEvalBatch.delete({
        where: { id: batchId },
      });
    });

    // Verify batch was deleted but regular resources remain
    expect(await prisma.agentEvalBatch.findUnique({ where: { id: batchId } })).toBeNull();
    expect(await prisma.agent.findUnique({ where: { id: regularAgentId } })).toBeTruthy();
    expect(await prisma.document.findUnique({ where: { id: regularDocId } })).toBeTruthy();

    // Clean up
    await prisma.document.delete({ where: { id: regularDocId } });
    await prisma.agent.delete({ where: { id: regularAgentId } });
  });

  it("should handle partial ephemeral resources correctly", async () => {
    // Create batch with ephemeral agent but regular documents
    const batchId = `test_batch3_${nanoid(8)}`;
    const ephemeralAgentId = `eph_agent_${nanoid(8)}`;
    const regularDocId = `regular_doc2_${nanoid(8)}`;

    // Create ephemeral agent
    const ephemeralAgent = await prisma.agent.create({
      data: {
        id: ephemeralAgentId,
        submittedById: testUserId,
      },
    });

    // Create batch
    const batch = await prisma.agentEvalBatch.create({
      data: {
        id: batchId,
        agentId: ephemeralAgentId,
        userId: testUserId,
        isEphemeral: true,
        expiresAt: new Date(Date.now() - 1000),
      },
    });

    // Link agent to batch (making it ephemeral)
    await prisma.agent.update({
      where: { id: ephemeralAgentId },
      data: { ephemeralBatchId: batchId },
    });

    // Create regular document (not linked to batch)
    const regularDoc = await prisma.document.create({
      data: {
        id: regularDocId,
        publishedDate: new Date(),
        submittedById: testUserId,
      },
    });

    // Delete the batch
    await prisma.$transaction(async (tx) => {
      // Delete jobs first if any
      await tx.job.deleteMany({
        where: { agentEvalBatchId: batchId },
      });
      // Then delete the batch
      await tx.agentEvalBatch.delete({
        where: { id: batchId },
      });
    });

    // Verify ephemeral agent was deleted but regular document remains
    expect(await prisma.agent.findUnique({ where: { id: ephemeralAgentId } })).toBeNull();
    expect(await prisma.document.findUnique({ where: { id: regularDocId } })).toBeTruthy();

    // Clean up
    await prisma.document.delete({ where: { id: regularDocId } });
  });
});