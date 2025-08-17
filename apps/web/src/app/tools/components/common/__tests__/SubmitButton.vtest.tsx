import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SubmitButton } from '../SubmitButton';

describe('SubmitButton', () => {
  it('should render with default text', () => {
    render(<SubmitButton onClick={vi.fn()} />);
    expect(screen.getByRole('button')).toHaveTextContent('Submit');
  });

  it('should render with custom text', () => {
    render(<SubmitButton onClick={vi.fn()} text="Custom Text" />);
    expect(screen.getByRole('button')).toHaveTextContent('Custom Text');
  });

  it('should call onClick when clicked and not loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<SubmitButton onClick={handleClick} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when loading', async () => {
    const handleClick = vi.fn();
    const user = userEvent.setup();
    
    render(<SubmitButton onClick={handleClick} isLoading={true} />);
    await user.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should be disabled when loading', () => {
    render(<SubmitButton onClick={vi.fn()} isLoading={true} />);
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should not be disabled when not loading', () => {
    render(<SubmitButton onClick={vi.fn()} isLoading={false} />);
    expect(screen.getByRole('button')).not.toBeDisabled();
  });

  it('should show spinner when loading', () => {
    render(<SubmitButton onClick={vi.fn()} isLoading={true} />);
    expect(screen.getByTestId('loading-spinner')).toBeInTheDocument();
  });

  it('should not show spinner when not loading', () => {
    render(<SubmitButton onClick={vi.fn()} isLoading={false} />);
    expect(screen.queryByTestId('loading-spinner')).not.toBeInTheDocument();
  });

  it('should have proper styling classes', () => {
    render(<SubmitButton onClick={vi.fn()} />);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('px-4');
    expect(button).toHaveClass('py-2');
    expect(button).toHaveClass('bg-blue-600');
    expect(button).toHaveClass('text-white');
    expect(button).toHaveClass('rounded-md');
  });

  it('should have disabled styling when loading', () => {
    render(<SubmitButton onClick={vi.fn()} isLoading={true} />);
    const button = screen.getByRole('button');
    
    expect(button).toHaveClass('opacity-50');
    expect(button).toHaveClass('cursor-not-allowed');
  });
});