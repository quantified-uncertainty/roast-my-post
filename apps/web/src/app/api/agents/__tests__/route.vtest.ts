import { describe, it, expect, vi, beforeEach } from 'vitest';
import { GET, PUT } from '../route';
import { NextRequest } from 'next/server';
import { authenticateRequestSessionFirst } from '@/infrastructure/auth/auth-helpers';

// Mock dependencies
vi.mock('@/infrastructure/auth/auth-helpers', () => ({
  authenticateRequestSessionFirst: vi.fn(),
}));

vi.mock('@roast/ai', () => {
  const actual = vi.importActual('@roast/ai');
  return {
    ...actual,
    AgentInputSchema: {
      parse: vi.fn((data) => data),
    },
  };
});

// Mock the Result class to match expected interface
vi.mock('@roast/domain', () => {
  const originalResult = {
    ok: (value: any) => ({
      isError: () => false,
      unwrap: () => value,
      error: () => null
    }),
    fail: (error: any) => ({
      isError: () => true,
      unwrap: () => { throw new Error('Cannot unwrap a failed result'); },
      error: () => error
    })
  };
  
  return {
    Result: originalResult,
    ValidationError: class ValidationError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'ValidationError';
      }
    },
    NotFoundError: class NotFoundError extends Error {
      constructor(message: string) {
        super(message);
        this.name = 'NotFoundError';
      }
    },
    AppError: class AppError extends Error {
      constructor(message: string, code: string) {
        super(message);
        this.name = 'AppError';
      }
    }
  };
});