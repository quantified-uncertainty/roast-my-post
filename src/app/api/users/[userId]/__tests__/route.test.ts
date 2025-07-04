import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/users/[userId]', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
    createdAt: new Date('2024-01-01'),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user details when user exists', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockUser);
    
    expect(prisma.user.findUnique).toHaveBeenCalledWith({
      where: { id: mockUserId },
      select: {
        id: true,
        name: true,
        email: true,
        image: true,
        createdAt: true,
      },
    });
  });

  it('should include isCurrentUser flag when authenticated', async () => {
    const currentUser = { id: mockUserId, email: 'test@example.com' };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUserId);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`, {
      headers: {
        'Authorization': 'Bearer test-key',
      },
    });
    
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ ...mockUser, isCurrentUser: true });
  });

  it('should set isCurrentUser to false for different user', async () => {
    const currentUser = { id: 'different-user', email: 'other@example.com' };
    (authenticateRequest as jest.Mock).mockResolvedValueOnce('different-user');
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(mockUser);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`, {
      headers: {
        'Authorization': 'Bearer test-key',
      },
    });
    
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ ...mockUser, isCurrentUser: false });
  });

  it('should return 404 when user not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    (prisma.user.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    (prisma.user.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch user');
  });
});