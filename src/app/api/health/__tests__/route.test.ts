import { GET } from '../route';
import { NextRequest } from 'next/server';

describe('GET /api/health', () => {
  it('should return 200 with ok status', async () => {
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET();
    
    expect(response.status).toBe(200);
    
    const data = await response.json();
    expect(data).toEqual({ status: 'ok' });
  });

  it('should not require authentication', async () => {
    // Test without any auth headers
    const request = new NextRequest('http://localhost:3000/api/health');
    const response = await GET();
    
    expect(response.status).toBe(200);
  });
});