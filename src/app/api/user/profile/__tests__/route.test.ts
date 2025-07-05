import { PATCH } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequestSessionFirst } from '@/lib/auth-helpers';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      update: jest.fn(),
    },
    userPreferences: {
      upsert: jest.fn(),
    },
    $transaction: jest.fn(),
  },
}));

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequestSessionFirst: jest.fn(),
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
    jest.clearAllMocks();
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
    
    // Mock the transaction to return the updated user
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      return callback({
        user: {
          update: jest.fn().mockResolvedValueOnce(updatedUser),
        },
        userPreferences: {
          upsert: jest.fn().mockResolvedValueOnce({}),
        },
      });
    });

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
    
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should update user profile with preferences', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    
    const updatedUser = {
      id: mockUserId,
      name: 'Updated Name',
      email: 'test@example.com',
    };
    
    // Mock the transaction to return the updated user
    (prisma.$transaction as jest.Mock).mockImplementation(async (callback) => {
      const mockTx = {
        user: {
          update: jest.fn().mockResolvedValueOnce(updatedUser),
        },
        userPreferences: {
          upsert: jest.fn().mockResolvedValueOnce({}),
        },
      };
      return callback(mockTx);
    });

    const request = new NextRequest('http://localhost:3000/api/user/profile', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ 
        name: 'Updated Name',
        preferences: {
          agreedToTerms: true,
          researchUpdates: true,
          quriUpdates: false,
        }
      }),
    });

    const response = await PATCH(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual(updatedUser);
    
    expect(prisma.$transaction).toHaveBeenCalled();
  });

  it('should handle database errors', async () => {
    (authenticateRequestSessionFirst as jest.Mock).mockResolvedValueOnce(mockUserId);
    (prisma.$transaction as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

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