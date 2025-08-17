import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { prisma } from '@roast/db';
import { UserModel } from '../User';

// Skip e2e tests unless we have a test database configured
const skipE2E = !process.env.DATABASE_URL || process.env.DATABASE_URL.includes('localhost');

describe.skipIf(skipE2E)('UserModel Integration Tests - Email Privacy', () => {
  let testUser1: any;
  let testUser2: any;

  beforeAll(async () => {
    // Create test users with emails
    testUser1 = await prisma.user.create({
      data: {
        email: 'user1@test.com',
        name: 'Test User 1',
      },
    });

    testUser2 = await prisma.user.create({
      data: {
        email: 'user2@test.com',
        name: 'Test User 2',
      },
    });
  });

  afterAll(async () => {
    // Clean up test data
    await prisma.user.deleteMany({
      where: {
        id: { in: [testUser1.id, testUser2.id] },
      },
    });
    await prisma.$disconnect();
  });

  describe('getAllUsers', () => {
    it('should not return email addresses for any users', async () => {
      const users = await UserModel.getAllUsers();
      
      const user1 = users.find(u => u.id === testUser1.id);
      const user2 = users.find(u => u.id === testUser2.id);
      
      expect(user1).toBeDefined();
      expect(user1?.email).toBeUndefined();
      expect(user1?.name).toBe('Test User 1');
      
      expect(user2).toBeDefined();
      expect(user2?.email).toBeUndefined();
      expect(user2?.name).toBe('Test User 2');
    });
  });

  describe('getUser', () => {
    it('should not return email when viewing another users profile', async () => {
      const user = await UserModel.getUser(testUser1.id, testUser2.id);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser1.id);
      expect(user?.name).toBe('Test User 1');
      expect(user?.email).toBeUndefined();
      expect(user?.isCurrentUser).toBe(false);
    });

    it('should return email when viewing own profile', async () => {
      const user = await UserModel.getUser(testUser1.id, testUser1.id);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser1.id);
      expect(user?.name).toBe('Test User 1');
      expect(user?.email).toBe('user1@test.com');
      expect(user?.isCurrentUser).toBe(true);
    });

    it('should not return email when not authenticated', async () => {
      const user = await UserModel.getUser(testUser1.id, undefined);
      
      expect(user).toBeDefined();
      expect(user?.id).toBe(testUser1.id);
      expect(user?.name).toBe('Test User 1');
      expect(user?.email).toBeUndefined();
      expect(user?.isCurrentUser).toBe(false);
    });
  });
});