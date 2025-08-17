import { vi } from 'vitest';
import { PATCH } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    user: {
      update: vi.fn(),
    },
  },
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: vi.fn(),
}));

vi.mock('@/infrastructure/logging/logger', () => ({
  logger: {
    error: vi.fn(),
  },
}));

describe('PATCH /api/user/profile', () => {
  const mockUserId = 'user-123';
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'New Name' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(401);
    
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should validate request body', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);

    const request = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ invalidField: 'value' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(400);
    
    const data = await response.json();
    expect(data.error).toBeDefined();
  });

  it('should update user profile successfully', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    
    const updatedUser = {
      id: mockUserId,
      name: 'Updated Name',
      email: 'test@example.com',
    };
    
    // Mock the user update
    (prisma.user.update as jest.Mock).mockResolvedValueOnce(updatedUser);

    const request = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual(updatedUser);
    
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: mockUserId },
      data: { name: 'Updated Name' },
      select: {
        id: true,
        name: true,
        email: true,
      },
    });
  });

  it('should handle database errors', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    (prisma.user.update as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ name: 'Updated Name' }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(500);
    
    const data = await response.json();
    expect(data.error).toBe('Internal server error');
  });
});