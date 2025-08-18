import { vi } from 'vitest';
import { GET, POST } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';
import { generateApiKey, hashApiKey } from '@/shared/utils/crypto';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    apiKey: {
      findMany: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: vi.fn(),
}));

vi.mock('@/shared/utils/crypto', () => ({
  generateApiKey: vi.fn(),
  hashApiKey: vi.fn(),
}));

describe('GET /api/user/api-keys', () => {
  const mockUserId = 'user-123';
  const mockUser = { id: mockUserId, email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys');
    const response = await GET(request);
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return user API keys', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const mockApiKeys = [
      {
        id: 'key-1',
        name: 'Production Key',
        createdAt: new Date('2024-01-01').toISOString(),
        lastUsedAt: new Date('2024-01-02').toISOString(),
        expiresAt: null,
      },
      {
        id: 'key-2',
        name: 'Test Key',
        createdAt: new Date('2024-01-03').toISOString(),
        lastUsedAt: null,
        expiresAt: new Date('2025-01-01').toISOString(),
      },
    ];
    
    (prisma.apiKey.findMany as vi.MockedFunction<any>).mockResolvedValueOnce(mockApiKeys);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ apiKeys: mockApiKeys });
    
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
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(undefined);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New Key' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(401);
  });

  it('should validate request body', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ invalidField: 'value' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(400);
  });

  it('should create a new API key', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const mockKey = 'rmp_1234567890abcdef'.padEnd(68, '0'); // rmp_ + 64 chars
    const mockHashedKey = 'hashed_key_value';
    
    (generateApiKey as vi.MockedFunction<any>).mockReturnValueOnce(mockKey);
    (hashApiKey as vi.MockedFunction<any>).mockReturnValueOnce(mockHashedKey);
    
    const createdKey = {
      id: 'key-123',
      name: 'New API Key',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: null,
    };
    
    (prisma.apiKey.create as vi.MockedFunction<any>).mockResolvedValueOnce(createdKey);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'New API Key' }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({
      apiKey: {
        ...createdKey,
        key: mockKey, // Unhashed key returned only on creation
      }
    });
    
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        name: 'New API Key',
        key: mockHashedKey,
        expiresAt: null,
      },
      select: {
        id: true,
        name: true,
        createdAt: true,
        expiresAt: true,
      },
    });
  });

  it('should create API key with expiration date', async () => {
    (authenticateRequestSessionFirst as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    const mockExpiringKey = 'rmp_1234567890';
    (generateApiKey as vi.MockedFunction<any>).mockReturnValueOnce(mockExpiringKey);
    (hashApiKey as vi.MockedFunction<any>).mockReturnValueOnce('hashed_key');
    
    const expiresAt = '2025-12-31T23:59:59Z';
    const createdKey = {
      id: 'key-123',
      name: 'Expiring Key',
      createdAt: new Date().toISOString(),
      lastUsedAt: null,
      expiresAt: new Date(expiresAt).toISOString(),
    };
    
    (prisma.apiKey.create as vi.MockedFunction<any>).mockResolvedValueOnce(createdKey);

    const request = new NextRequest('http://localhost:3000/api/user/api-keys', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: 'Expiring Key', expiresIn: 365 }),
    });
    
    const response = await POST(request);
    expect(response.status).toBe(200);
    
    expect(prisma.apiKey.create).toHaveBeenCalledWith({
      data: {
        userId: mockUserId,
        name: 'Expiring Key',
        key: 'hashed_key',
        expiresAt: expect.any(Date),
      },
      select: expect.any(Object),
    });
  });
});