import { GET } from '../route';
import { NextRequest } from 'next/server';
import { UserModel } from '@/models/User';

// Mock dependencies
jest.mock('@/models/User', () => ({
  UserModel: {
    getUserDocumentsCount: jest.fn(),
  },
}));

describe('GET /api/users/[userId]/documents/count', () => {
  const mockUserId = 'user-123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should not require authentication', async () => {
    (UserModel.getUserDocumentsCount as jest.Mock).mockResolvedValueOnce(12);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 12 });
  });

  it('should return document count for user', async () => {
    (UserModel.getUserDocumentsCount as jest.Mock).mockResolvedValueOnce(5);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 5 });
    
    expect(UserModel.getUserDocumentsCount).toHaveBeenCalledWith(mockUserId);
  });

  it('should return zero when user has no documents', async () => {
    (UserModel.getUserDocumentsCount as jest.Mock).mockResolvedValueOnce(0);

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({ count: 0 });
  });

  it('should return 400 when userId is missing', async () => {
    const request = new NextRequest(`http://localhost:3000/api/users/undefined/documents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: undefined as any }) });
    
    expect(response.status).toBe(400);
    const data = await response.json();
    expect(data.error).toBe('User ID is required');
  });

  it('should handle database errors', async () => {
    (UserModel.getUserDocumentsCount as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/users/${mockUserId}/documents/count`);
    const response = await GET(request, { params: Promise.resolve({ userId: mockUserId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch document count');
  });
});