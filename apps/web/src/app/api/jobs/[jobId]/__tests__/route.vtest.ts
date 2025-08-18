import { vi } from 'vitest';
import { GET } from '../route';
import { NextRequest } from 'next/server';
import { prisma } from '@roast/db';
import { authenticateRequest } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
vi.mock('@roast/db', () => ({
  prisma: {
    job: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequest: vi.fn(),
}));

describe('GET /api/jobs/[jobId]', () => {
  const mockJobId = 'job-123';
  const mockUser = { id: 'user-123', email: 'test@example.com' };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should require authentication', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(undefined);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(401);
    const data = await response.json();
    expect(data.error).toBe('Authentication required');
  });

  it('should return 404 if job not found', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(null);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(404);
    const data = await response.json();
    expect(data.error).toBe('Job not found');
  });

  it('should return 403 if user does not own the job', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    // First call for ownership check
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({
      evaluation: {
        document: {
          submittedById: 'other-user-id',
        },
      },
    });

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(403);
    const data = await response.json();
    expect(data.error).toBe('You do not have permission to access this resource');
  });

  it('should return job details for pending job', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    // First call for ownership check
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({
      evaluation: {
        document: {
          submittedById: mockUser.id,
        },
      },
    });
    
    // Second call for actual data
    const mockJob = {
      id: mockJobId,
      status: 'pending',
      createdAt: new Date('2024-01-01').toISOString(),
      completedAt: null,
      error: null,
      logs: null,
      priceInDollars: null,
      durationInSeconds: null,
      attempts: 0,
      originalJobId: null,
      tasks: null,
    };
    
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockJob);
  });

  it('should return job details for completed job with evaluation', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    // First call for ownership check
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({
      evaluation: {
        document: {
          submittedById: mockUser.id,
        },
      },
    });
    
    // Second call for actual data
    const mockJob = {
      id: mockJobId,
      status: 'completed',
      createdAt: new Date('2024-01-01').toISOString(),
      completedAt: new Date('2024-01-01T00:05:00Z').toISOString(),
      error: null,
      logs: null,
      priceInDollars: 1.5,
      durationInSeconds: 300,
      attempts: 1,
      originalJobId: null,
      tasks: null,
    };
    
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockJob);
  });

  it('should return job details for failed job', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    
    // First call for ownership check
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce({
      evaluation: {
        document: {
          submittedById: mockUser.id,
        },
      },
    });
    
    // Second call for actual data
    const mockJob = {
      id: mockJobId,
      status: 'failed',
      createdAt: new Date('2024-01-01').toISOString(),
      completedAt: new Date('2024-01-01T00:05:00Z').toISOString(),
      error: { message: 'Evaluation failed', code: 'EVAL_ERROR' },
      logs: ['Error log entry'],
      priceInDollars: 0.5,
      durationInSeconds: 60,
      attempts: 3,
      originalJobId: null,
      tasks: null,
    };
    
    (prisma.job.findUnique as vi.MockedFunction<any>).mockResolvedValueOnce(mockJob);

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual(mockJob);
  });

  it('should handle database errors', async () => {
    (authenticateRequest as vi.MockedFunction<any>).mockResolvedValueOnce(mockUser.id);
    (prisma.job.findUnique as vi.MockedFunction<any>).mockRejectedValueOnce(new Error('Database error'));

    const request = new NextRequest(`http://localhost:3000/api/jobs/${mockJobId}`);
    const response = await GET(request, { params: Promise.resolve({ jobId: mockJobId }) });
    
    expect(response.status).toBe(500);
    const data = await response.json();
    expect(data.error).toBe('Failed to fetch job');
  });
});