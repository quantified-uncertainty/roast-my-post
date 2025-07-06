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
    getUser: jest.fn(),
  },
}));

describe('GET /api/users/[userId]', () => {
  const mockUserId = 'user-123';
  const mockUser = {
    id: mockUserId,
    name: 'Test User',
    email: 'test@example.com',
    image: 'https://example.com/avatar.jpg',
  };
  
  const mockUserWithoutEmail = {
    id: mockUserId,
    name: 'Test User',
    image: 'https://example.com/avatar.jpg',
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return user details without email when viewing other users profile', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    // UserModel should return without email for other users
    (UserModel.getUser as jest.Mock).mockResolvedValueOnce(mockUserWithoutEmail);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockUserWithoutEmail);
    expect(data.email).toBeUndefined();
    
    expect(UserModel.getUser).toHaveBeenCalledWith(mockUserId, undefined);
  });

  it('should include email and isCurrentUser flag when viewing own profile', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(mockUserId);
    // UserModel should return with email for own profile
    (UserModel.getUser as jest.Mock).mockResolvedValueOnce({ ...mockUser, isCurrentUser: true });

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`, {
      headers: {
        'Authorization': 'Bearer test-key',
      },
    });
    
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ ...mockUser, isCurrentUser: true });
    expect(data.email).toBe('test@example.com'); // Email should be present for own profile
    expect(UserModel.getUser).toHaveBeenCalledWith(mockUserId, mockUserId);
  });

  it('should exclude email when viewing different users profile', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce('different-user');
    // UserModel should return without email for other users
    (UserModel.getUser as jest.Mock).mockResolvedValueOnce({ ...mockUserWithoutEmail, isCurrentUser: false });

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`, {
      headers: {
        'Authorization': 'Bearer test-key',
      },
    });
    
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ ...mockUserWithoutEmail, isCurrentUser: false });
    expect(data.email).toBeUndefined(); // Email should not be present for other users
    expect(UserModel.getUser).toHaveBeenCalledWith(mockUserId, 'different-user');
  });

  it('should return 404 when user not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    (UserModel.getUser as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('User not found');
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce(undefined);
    (UserModel.getUser as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch user');
  });
});