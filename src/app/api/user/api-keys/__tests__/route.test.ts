import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequestSessionFirst } from '@/lib/auth-helpers';
import crypto from 'crypto';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    apiKey: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequestSessionFirst: jest.fn(),
}));

jest.mock('crypto', () => ({
  randomBytes: jest.fn(),
  createHash: jest.fn(),
}));

describe('GET /api/user/api-keys', () => {
  const mockUserId = 'user-123';
  const mockUser = { id: mockUserId, email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys');
    const response = await GET();
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return user API keys', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const mockApiKeys = [
      {
        id: 'key-1',
        name: 'Production Key',
        createdAt: new Date('2024-01-01'),
        lastUsedAt: new Date('2024-01-02'),
        expiresAt: null,
      },
      {
        id: 'key-2',
        name: 'Test Key',
        createdAt: new Date('2024-01-03'),
        lastUsedAt: null,
        expiresAt: new Date('2025-01-01'),
      },
    ];
    
    (prisma.apiKey.findMany as jest.Mock).mockResolvedValueOnce(mockApiKeys);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys');
    const response = await GET();
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockApiKeys);
    
    expect(prisma.apiKey.findMany).toHaveBeenCalledWith({
      where: { userId: mockUserId },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  });
});

describe('POST /api/user/api-keys', () => {
  const mockUserId = 'user-123';
  const mockUser = { id: mockUserId, email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Key' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should create a new API key', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    const mockKey = 'rmp_sk_live_1234567890';
    const mockHashedKey = 'hashed_key_value';
    
    (crypto.randomBytes as jest.Mock).mockReturnValueOnce({
      toString: () => '1234567890',
    });
    
    (crypto.createHash as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValueOnce(mockHashedKey),
    });
    
    const createdKey = {
      id: 'key-123',
      name: 'New API Key',
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: null,
    };
    
    (prisma.apiKey.create as jest.Mock).mockResolvedValueOnce(createdKey);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New API Key' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(201);
    
    const data = await response.json();
    expect(data).toEqual({
      ...createdKey,
      key: mockKey, // Unhashed key returned only on creation
    });
    
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        name: 'New API Key',
        hashedKey: mockHashedKey,
        expiresAt: undefined,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        lastUsedAt: true,
        expiresAt: true,
      },
    });
  });

  it('should create API key with expiration date', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUser.id);
    
    (crypto.randomBytes as jest.Mock).mockReturnValueOnce({
      toString: () => '1234567890',
    });
    
    (crypto.createHash as jest.Mock).mockReturnValueOnce({
      update: jest.fn().mockReturnThis(),
      digest: jest.fn().mockReturnValueOnce('hashed_key'),
    });
    
    const expiresAt = '2025-12-31T23:59:59Z';
    const createdKey = {
      id: 'key-123',
      name: 'Expiring Key',
      createdAt: new Date(),
      lastUsedAt: null,
      expiresAt: new Date(expiresAt),
    };
    
    (prisma.apiKey.create as jest.Mock).mockResolvedValueOnce(createdKey);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Expiring Key', expiresAt }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(201);
    
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        name: 'Expiring Key',
        hashedKey: 'hashed_key',
        expiresAt: new Date(expiresAt),
      },
      select: expect.any(Object),
    });
  });
});