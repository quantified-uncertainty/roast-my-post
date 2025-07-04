import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@/lib/prisma';
import { authenticateRequest } from '@/lib/auth';

// Mock dependencies
jest.mock('@/lib/prisma', () => ({
  prisma: {
    job: {
      findUnique: jest.fn(),
    },
  },
}));

jest.mock('@/lib/auth', () => ({
  authenticateRequest: jest.fn(),
}));

describe('GET /api/jobs/[jobId]', () => {
  const mockJobId = 'job-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: null });

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 404 if job not found', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.job.findUnique as jest.Mock).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Job not found');
  });

  it('should return 403 if user does not own the job', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockJob = {
      id: mockJobId,
      ownerId: 'other-user-id', // Different owner
      type: 'evaluation',
      status: 'completed',
    };
    
    (prisma.job.findUnique as jest.Mock).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('Forbidden');
  });

  it('should return job details for pending job', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockJob = {
      id: mockJobId,
      ownerId: mockUser.id,
      type: 'evaluation',
      status: 'pending',
      createdAt: new Date('2024-01-01'),
      completedAt: null,
      result: null,
      error: null,
      evaluation: null,
    };
    
    (prisma.job.findUnique as jest.Mock).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      id: mockJobId,
      status: 'pending',
      createdAt: mockJob.createdAt.toISOString(),
      completedAt: null,
    });
  });

  it('should return job details for completed job with evaluation', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockJob = {
      id: mockJobId,
      ownerId: mockUser.id,
      type: 'evaluation',
      status: 'completed',
      createdAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-01T00:05:00Z'),
      result: null,
      error: null,
      evaluation: {
        id: 'eval-123',
        summary: 'Evaluation summary',
        overallGrade: 85,
      },
    };
    
    (prisma.job.findUnique as jest.Mock).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      id: mockJobId,
      status: 'completed',
      createdAt: mockJob.createdAt.toISOString(),
      completedAt: mockJob.completedAt.toISOString(),
      evaluationId: 'eval-123',
    });
  });

  it('should return job details for failed job', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    
    const mockJob = {
      id: mockJobId,
      ownerId: mockUser.id,
      type: 'evaluation',
      status: 'failed',
      createdAt: new Date('2024-01-01'),
      completedAt: new Date('2024-01-01T00:05:00Z'),
      result: null,
      error: { message: 'Evaluation failed', code: 'EVAL_ERROR' },
      evaluation: null,
    };
    
    (prisma.job.findUnique as jest.Mock).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      id: mockJobId,
      status: 'failed',
      createdAt: mockJob.createdAt.toISOString(),
      completedAt: mockJob.completedAt.toISOString(),
      error: mockJob.error,
    });
  });

  it('should handle database errors', async () => {
    (authenticateRequest as jest.Mock).mockResolvedValueOnce({ user: mockUser });
    (prisma.job.findUnique as jest.Mock).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: { jobId: mockJobId } });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch job');
  });
});