/**
 * Integration tests for Decimal field serialization
 * 
 * These tests ensure that Prisma Decimal fields are handled correctly
 * throughout the application, preventing issues like the one that broke
 * the versions page.
 */

import { prisma } from '@roast/db';
import { nanoid } from 'nanoid';
// Import Decimal directly from the generated client to avoid bundling issues
import type { Prisma } from '@roast/db';

const describeIfDb = process.env.DATABASE_URL ? describe : describe.skip;

describeIfDb('Decimal Field Serialization', () => {
  let testUserId: string;
  let testDocId: string;
  let testAgentId: string;
  let testEvalId: string;
  let testJobId: string;

  beforeAll(async () => {
    // Create minimal test data
    testUserId = `test_user_${nanoid(8)}`;
    await prisma.user.create({
      data: {
        id: testUserId,
        email: `${testUserId}@test.com`,
      },
    });

    testDocId = `test_doc_${nanoid(8)}`;
    await prisma.document.create({
      data: {
        id: testDocId,
        publishedDate: new Date(),
        submittedById: testUserId,
        versions: {
          create: {
            version: 1,
            title: 'Test Document',
            content: 'Test content',
            authors: ['Test Author'],
          },
        },
      },
    });

    testAgentId = `test_agent_${nanoid(8)}`;
    await prisma.agent.create({
      data: {
        id: testAgentId,
        submittedById: testUserId,
        versions: {
          create: {
            version: 1,
            name: 'Test Agent',
            description: 'Test agent',
            primaryInstructions: 'Test',
          },
        },
      },
    });

    testEvalId = `test_eval_${nanoid(8)}`;
    await prisma.evaluation.create({
      data: {
        id: testEvalId,
        documentId: testDocId,
        agentId: testAgentId,
      },
    });

    testJobId = `test_job_${nanoid(8)}`;
    await prisma.job.create({
      data: {
        id: testJobId,
        status: 'COMPLETED',
        evaluationId: testEvalId,
        // Test various decimal values
        priceInDollars: 12.456789,  // Will be stored as Decimal(10,6)
        durationInSeconds: 180,      // Regular integer
      },
    });
  });

  afterAll(async () => {
    // Cleanup in correct order to avoid foreign key constraints
    try {
      await prisma.evaluationVersion.deleteMany({ 
        where: { evaluationId: testEvalId } 
      });
    } catch {}
    
    await prisma.job.deleteMany({ where: { id: testJobId } });
    await prisma.evaluation.deleteMany({ where: { id: testEvalId } });
    await prisma.agentVersion.deleteMany({ where: { agentId: testAgentId } });
    await prisma.agent.deleteMany({ where: { id: testAgentId } });
    await prisma.documentVersion.deleteMany({ where: { documentId: testDocId } });
    await prisma.document.deleteMany({ where: { id: testDocId } });
    await prisma.user.deleteMany({ where: { id: testUserId } });
    await prisma.$disconnect();
  });

  describe('Job Decimal Fields', () => {
    it('should return priceInDollars as a Decimal instance', async () => {
      const job = await prisma.job.findUnique({
        where: { id: testJobId },
      });

      expect(job).toBeDefined();
      expect(job!.priceInDollars).toBeDefined();
      // Check it's a Decimal-like object (has toString, toNumber methods)
      expect(typeof job!.priceInDollars).toBe('object');
      expect(job!.priceInDollars).toHaveProperty('toString');
      expect(job!.priceInDollars).toHaveProperty('toNumber');
    });

    it('should convert Decimal to number correctly', async () => {
      const job = await prisma.job.findUnique({
        where: { id: testJobId },
      });

      const priceAsNumber = Number(job!.priceInDollars);
      expect(typeof priceAsNumber).toBe('number');
      expect(priceAsNumber).toBeCloseTo(12.456789, 5);
      expect(isNaN(priceAsNumber)).toBe(false);
    });

    it('should handle null Decimal fields', async () => {
      const nullJobId = `null_job_${nanoid(8)}`;
      await prisma.job.create({
        data: {
          id: nullJobId,
          status: 'PENDING',
          evaluationId: testEvalId,
          priceInDollars: null,
          durationInSeconds: null,
        },
      });

      const job = await prisma.job.findUnique({
        where: { id: nullJobId },
      });

      expect(job!.priceInDollars).toBeNull();
      expect(Number(job!.priceInDollars)).toBe(0); // Number(null) = 0
      
      await prisma.job.delete({ where: { id: nullJobId } });
    });

    it('should handle zero Decimal values', async () => {
      const zeroJobId = `zero_job_${nanoid(8)}`;
      await prisma.job.create({
        data: {
          id: zeroJobId,
          status: 'COMPLETED',
          evaluationId: testEvalId,
          priceInDollars: 0,
          durationInSeconds: 0,
        },
      });

      const job = await prisma.job.findUnique({
        where: { id: zeroJobId },
      });

      // Check it's a Decimal-like object (has toString, toNumber methods)
      expect(typeof job!.priceInDollars).toBe('object');
      expect(job!.priceInDollars).toHaveProperty('toString');
      expect(job!.priceInDollars).toHaveProperty('toNumber');
      expect(Number(job!.priceInDollars)).toBe(0);
      
      await prisma.job.delete({ where: { id: zeroJobId } });
    });

    it('should handle large Decimal values', async () => {
      const largeJobId = `large_job_${nanoid(8)}`;
      await prisma.job.create({
        data: {
          id: largeJobId,
          status: 'COMPLETED',
          evaluationId: testEvalId,
          priceInDollars: 9999.999999,  // Max precision for Decimal(10,6)
          durationInSeconds: 999999,
        },
      });

      const job = await prisma.job.findUnique({
        where: { id: largeJobId },
      });

      const priceAsNumber = Number(job!.priceInDollars);
      expect(priceAsNumber).toBeCloseTo(9999.999999, 5);
      
      await prisma.job.delete({ where: { id: largeJobId } });
    });
  });

  describe('Decimal Serialization in Complex Queries', () => {
    it('should handle Decimals in joined queries', async () => {
      const evaluation = await prisma.evaluation.findUnique({
        where: { id: testEvalId },
        include: {
          versions: {
            include: {
              job: true,
            },
          },
        },
      });

      const job = evaluation?.versions[0]?.job;
      if (job?.priceInDollars) {
        // Can't use instanceof Decimal here due to module boundaries
        expect(typeof job.priceInDollars).toBe('object');
        expect(job.priceInDollars).toHaveProperty('toNumber');
        expect(Number(job.priceInDollars)).toBeCloseTo(12.456789, 5);
      }
    });

    it('should handle Decimals in aggregations', async () => {
      const result = await prisma.job.aggregate({
        where: { evaluationId: testEvalId },
        _sum: {
          priceInDollars: true,
        },
        _avg: {
          priceInDollars: true,
        },
      });

      // Aggregations also return Decimal types
      if (result._sum.priceInDollars) {
        expect(typeof result._sum.priceInDollars).toBe('object');
        expect(Number(result._sum.priceInDollars)).toBeCloseTo(12.456789, 5);
      }

      if (result._avg.priceInDollars) {
        expect(typeof result._avg.priceInDollars).toBe('object');
        expect(Number(result._avg.priceInDollars)).toBeCloseTo(12.456789, 5);
      }
    });
  });

  describe('Common Decimal Conversion Patterns', () => {
    it('should format Decimal as currency string', async () => {
      const job = await prisma.job.findUnique({
        where: { id: testJobId },
      });

      const price = Number(job!.priceInDollars);
      const formatted = `$${price.toFixed(2)}`;
      expect(formatted).toBe('$12.46');
    });

    it('should format Decimal with specific precision', async () => {
      const job = await prisma.job.findUnique({
        where: { id: testJobId },
      });

      const price = Number(job!.priceInDollars);
      const formatted = `$${price.toFixed(3)}`;
      expect(formatted).toBe('$12.457');
    });

    it('should handle Decimal in JSON serialization', async () => {
      const job = await prisma.job.findUnique({
        where: { id: testJobId },
      });

      // Simulate what happens when sending to client
      const serialized = JSON.parse(JSON.stringify({
        id: job!.id,
        price: job!.priceInDollars,  // Decimal gets stringified
      }));

      // Decimal becomes a string in JSON
      expect(typeof serialized.price).toBe('string');
      expect(serialized.price).toBe('12.456789');
      
      // Can convert back to number
      expect(Number(serialized.price)).toBeCloseTo(12.456789, 5);
    });
  });

  describe('Real-world Scenario: Versions Page', () => {
    it('should handle evaluation version with job data correctly', async () => {
      // Create the exact scenario from the versions page
      const agentVersion = await prisma.agentVersion.findFirst({
        where: { agentId: testAgentId },
      });
      
      const docVersion = await prisma.documentVersion.findFirst({
        where: { documentId: testDocId },
      });

      await prisma.evaluationVersion.create({
        data: {
          evaluationId: testEvalId,
          version: 1,
          agentId: testAgentId,
          agentVersionId: agentVersion!.id,
          documentVersionId: docVersion!.id,
          job: {
            connect: { id: testJobId }
          },
          summary: 'Test summary',
          analysis: 'Test analysis',
        },
      });

      // Fetch like the versions page would
      const evalVersion = await prisma.evaluationVersion.findFirst({
        where: {
          evaluationId: testEvalId,
          version: 1,
        },
        include: {
          job: true,
        },
      });

      // This is the fix we applied to the versions page
      const durationInSecondsRaw = evalVersion?.job?.durationInSeconds;
      const durationInSeconds = durationInSecondsRaw != null 
        ? Number(durationInSecondsRaw) 
        : null;

      expect(durationInSeconds).toBe(180);
      expect(typeof durationInSeconds).toBe('number');

      // Price handling
      const priceRaw = evalVersion?.job?.priceInDollars;
      const price = priceRaw != null ? Number(priceRaw) : null;
      
      expect(price).toBeCloseTo(12.456789, 5);
      expect(typeof price).toBe('number');

      // Cleanup
      await prisma.evaluationVersion.deleteMany({
        where: { evaluationId: testEvalId },
      });
    });
  });
});