import { GET } from '../route';
import { NextRequest } from 'next/server';
import { UserModel } from '@/models/User';
import { authenticateRequest } from '@/lib/auth-helpers';

// Mock dependencies

jest.mock('@/lib/auth-helpers', () => ({
  authenticateRequest: jest.fn(),
}));

jest.mock('@/models/User', () => ({
  UserModel: {
    getAllUsers: jest.fn(),
  },
}));

describe('GET /api/users', () => {
  const mockUsers = [
    {
      id: 'user-1',
      name: 'User One',
      email: 'user1@example.com',
      image: null,
      createdAt: new Date('2024-01-01'),
    },
    {
      id: 'user-2', 
      name: 'User Two',
      email: 'user2@example.com',
      image: 'https://example.com/avatar.jpg',
      createdAt: new Date('2024-01-02'),
    },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return all users when not authenticated', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(null);
    (UserModel.getAllUsers as jest.Mock).mockResolvedValueOnce(mockUsers);

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    
    // Without auth, all users have isCurrentUser: false
    expect(data).toEqual(mockUsers.map(user => ({ 
      ...user, 
      createdAt: user.createdAt.toISOString(), 
      isCurrentUser: false 
    })));
    
    expect(UserModel.getAllUsers).toHaveBeenCalled();
  });

  it('should include isCurrentUser flag when authenticated', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce('user-1');
    (UserModel.getAllUsers as jest.Mock).mockResolvedValueOnce(mockUsers);

    const request = new NextRequest('http://localhost:3000/api/users', {
      headers: {
        'Authorization': 'Bearer test-key',
      },
    });
    
    const response = await GET(request);
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual([
      { ...mockUsers[0], createdAt: mockUsers[0].createdAt.toISOString(), isCurrentUser: true },
      { ...mockUsers[1], createdAt: mockUsers[1].createdAt.toISOString(), isCurrentUser: false },
    ]);
  });

  it('should handle empty user list', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(null);
    (UserModel.getAllUsers as jest.Mock).mockResolvedValueOnce([]);

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual([]);
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(null);
    (UserModel.getAllUsers as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest('http://localhost:3000/api/users');
    const response = await GET(request);
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch users');
  });
});