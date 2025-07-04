import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    document: {
      count: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/users/[userId]/documents/count', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: { userId: mockUserId } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return document count for user', async () => {
    const mockUser = { id: 'current-user', email: 'test@example.com' };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(12);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: { userId: mockUserId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 12 });
    
    expect(prisma.document.count).toHaveBeenCalledWith({
      where: { ownerId: mockUserId },
    });
  });

  it('should return zero when user has no documents', async () => {
    const mockUser = { id: 'current-user', email: 'test@example.com' };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.document.count as jest.Mock).mockResolvedValueOnce(0);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: { userId: mockUserId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  it('should handle database errors', async () => {
    const mockUser = { id: 'current-user', email: 'test@example.com' };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.document.count as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: { userId: mockUserId } });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch document count');
  });
});