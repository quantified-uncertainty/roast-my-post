import { vi } from 'vitest';

import { renderHook, act, waitFor } from '@testing-library/react';
import { useToolExecution } from '../useToolExecution';
import { runToolWithAuth } from '../../utils/runToolWithAuth';

// Mock the runToolWithAuth function
vi.mock('../../utils/runToolWithAuth');
const mockRunToolWithAuth = runToolWithAuth as vi.MockedFunction<typeof runToolWithAuth>;

describe('useToolExecution', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should initialize with default state', () => {
    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test')
    );

    expect(result.current.result).toBeNull();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it('should execute successfully and update state', async () => {
    const mockResult = { result: 'success' };
    const mockResponse = { result: mockResult, cost: null, sessionId: 'test-session' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() =>
      useToolExecution<{ text: string }, { result: string }>('/api/test')
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(result.current.result).toEqual(mockResult);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    expect(mockRunToolWithAuth).toHaveBeenCalledWith('/api/test', { text: 'test' });
  });

  it('should handle errors properly', async () => {
    const mockError = new Error('Test error');
    mockRunToolWithAuth.mockRejectedValueOnce(mockError);

    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test')
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe('Test error');
    });
  });

  it('should validate input before execution', async () => {
    const validateInput = vi.fn((input) => 
      input.text.length > 0 || 'Text is required'
    );

    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test', {
        validateInput
      })
    );

    await act(async () => {
      await result.current.execute({ text: '' });
    });

    expect(validateInput).toHaveBeenCalledWith({ text: '' });
    expect(result.current.error).toBe('Text is required');
    expect(mockRunToolWithAuth).not.toHaveBeenCalled();
  });

  it('should process response when processor is provided', async () => {
    const mockResult = { result: 'original' };
    const mockResponse = { result: mockResult, cost: null, sessionId: 'test-session' };
    const processedResponse = { result: 'processed' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResponse);

    const processResponse = vi.fn(() => processedResponse);

    const { result } = renderHook(() =>
      useToolExecution<{ text: string }, { result: string }>('/api/test', {
        processResponse
      })
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(processResponse).toHaveBeenCalledWith(mockResult);
      expect(result.current.result).toEqual(processedResponse);
    });
  });

  it('should call lifecycle callbacks', async () => {
    const mockResult = { result: 'success' };
    const mockResponse = { result: mockResult, cost: null, sessionId: 'test-session' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResponse);

    const onExecuteStart = vi.fn();
    const onExecuteComplete = vi.fn();

    const { result } = renderHook(() =>
      useToolExecution<{ text: string }, { result: string }>('/api/test', {
        onExecuteStart,
        onExecuteComplete
      })
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(onExecuteStart).toHaveBeenCalled();
      expect(onExecuteComplete).toHaveBeenCalledWith(mockResult, undefined);
    });
  });

  it('should reset state correctly', () => {
    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test')
    );

    // Set some state first
    act(() => {
      result.current.setResult({ result: 'test' });
    });

    expect(result.current.result).toEqual({ result: 'test' });

    // Reset
    act(() => {
      result.current.reset();
    });

    expect(result.current.result).toBeNull();
    expect(result.current.error).toBeNull();
    expect(result.current.isLoading).toBe(false);
  });

  it('should format error with custom formatter', async () => {
    const mockError = new Error('Original error');
    mockRunToolWithAuth.mockRejectedValueOnce(mockError);

    const formatError = vi.fn((err) => `Formatted: ${err}`);

    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test', {
        formatError
      })
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(formatError).toHaveBeenCalledWith(mockError);
      expect(result.current.error).toBe('Formatted: Error: Original error');
    });
  });
});