import { GET } from '../route';
import { NextRequest } from 'next/server';
import { UserModel } from '@/models/User';

// Mock dependencies
jest.mock('@/models/User', () => ({
  UserModel: {
    getUserAgentsCount: jest.fn(),
  },
}));

describe('GET /api/users/[userId]/agents/count', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not require authentication', async () => {
    (UserModel.getUserAgentsCount as jest.Mock).mockResolvedValueOnce(3);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/agents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 3 });
  });

  it('should return agent count for user', async () => {
    (UserModel.getUserAgentsCount as jest.Mock).mockResolvedValueOnce(7);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/agents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 7 });
    
    expect(UserModel.getUserAgentsCount).toHaveBeenCalledWith(mockUserId);
  });

  it('should return zero when user has no agents', async () => {
    (UserModel.getUserAgentsCount as jest.Mock).mockResolvedValueOnce(0);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/agents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  it('should return 400 when userId is missing', async () => {
    const request = new NextRequest(`http://localhost:3000/api/users/undefined/agents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: undefined as any }) });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('User ID is required');
  });

  it('should handle database errors', async () => {
    (UserModel.getUserAgentsCount as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/agents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch agent count');
  });
});