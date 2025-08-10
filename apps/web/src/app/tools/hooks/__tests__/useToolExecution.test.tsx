/**
 * @jest-environment jsdom
 */
import { renderHook, act, waitFor } from '@testing-library/react';
import { useToolExecution } from '../useToolExecution';
import { runToolWithAuth } from '../../utils/runToolWithAuth';

// Mock the runToolWithAuth function
jest.mock('../../utils/runToolWithAuth');
const mockRunToolWithAuth = runToolWithAuth as jest.MockedFunction<typeof runToolWithAuth>;

describe('useToolExecution', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
    const mockResponse = { result: 'success' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResponse);

    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test')
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(result.current.result).toEqual(mockResponse);
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
    const validateInput = jest.fn((input) => 
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
    const mockResponse = { result: 'original' };
    const processedResponse = { result: 'processed' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResponse);

    const processResponse = jest.fn(() => processedResponse);

    const { result } = renderHook(() => 
      useToolExecution<{ text: string }, { result: string }>('/api/test', {
        processResponse
      })
    );

    await act(async () => {
      await result.current.execute({ text: 'test' });
    });

    await waitFor(() => {
      expect(processResponse).toHaveBeenCalledWith(mockResponse);
      expect(result.current.result).toEqual(processedResponse);
    });
  });

  it('should call lifecycle callbacks', async () => {
    const mockResponse = { result: 'success' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResponse);

    const onExecuteStart = jest.fn();
    const onExecuteComplete = jest.fn();

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
      expect(onExecuteComplete).toHaveBeenCalledWith(mockResponse, undefined);
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

    const formatError = jest.fn((err) => `Formatted: ${err}`);

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