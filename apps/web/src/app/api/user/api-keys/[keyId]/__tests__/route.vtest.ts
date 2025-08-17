import { vi } from 'vitest';
import { DELETE } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    apiKey: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: vi.fn(),
}));

describe('DELETE /api/user/api-keys/[keyId]', () => {
  const mockUserId = 'user-123';
  const mockUser = { id: mockUserId, email: 'test@example.com' };
  const mockKeyId = 'key-456';

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/user/api-keys/${mockKeyId}`);
    const response = await DELETE(request, { params: Promise.resolve({ keyId: mockKeyId }) });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if API key not found', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    (prisma.apiKey.findFirst as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/user/api-keys/${mockKeyId}`);
    const response = await DELETE(request, { params: Promise.resolve({ keyId: mockKeyId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('API key not found');
  });

  it('should prevent deleting API keys owned by other users', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    
    const mockApiKey = {
      id: mockKeyId,
      userId: 'other-user-123', // Different user
      name: 'Some Key',
    };
    
    (prisma.apiKey.findFirst as jest.Mock).mockResolvedValueOnce(null); // findFirst returns null when no match

    const request = new NextRequest(`http://localhost:3000/api/user/api-keys/${mockKeyId}`);
    const response = await DELETE(request, { params: Promise.resolve({ keyId: mockKeyId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('API key not found');
  });

  it('should successfully delete own API key', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    
    const mockApiKey = {
      id: mockKeyId,
      userId: mockUserId,
      name: 'My Key',
    };
    
    (prisma.apiKey.findFirst as jest.Mock).mockResolvedValueOnce(mockApiKey);
    (prisma.apiKey.delete as jest.Mock).mockResolvedValueOnce(mockApiKey);

    const request = new NextRequest(`http://localhost:3000/api/user/api-keys/${mockKeyId}`);
    const response = await DELETE(request, { params: Promise.resolve({ keyId: mockKeyId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ success: true });
    
    expect(prisma.apiKey.findFirst).toHaveBeenCalledWith({
      where: {
        id: mockKeyId,
        userId: mockUserId,
      },
    });
    
    expect(prisma.apiKey.delete).toHaveBeenCalledWith({
      where: { id: mockKeyId },
    });
  });

  it('should handle database errors gracefully', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    
    const mockApiKey = {
      id: mockKeyId,
      userId: mockUserId,
      name: 'My Key',
    };
    
    (prisma.apiKey.findFirst as jest.Mock).mockResolvedValueOnce(mockApiKey);
    (prisma.apiKey.delete as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/user/api-keys/${mockKeyId}`);
    const response = await DELETE(request, { params: Promise.resolve({ keyId: mockKeyId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to delete API key');
  });
});