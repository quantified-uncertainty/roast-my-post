import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ErrorDisplay } from '../ErrorDisplay';

describe('ErrorDisplay', () => {
  it('should render nothing when error is null', () => {
    const { container } = render(<ErrorDisplay error={null} />);
    expect(container.firstChild).toBeNull();
  });

  it('should render error message when error is provided', () => {
    render(<ErrorDisplay error="Test error message" />);
    
    expect(screen.getByText('Error: Test error message')).toBeInTheDocument();
  });

  it('should apply custom className when provided', () => {
    render(<ErrorDisplay error="Test error" className="custom-class" />);
    
    const errorDiv = screen.getByText('Error: Test error').parentElement;
    expect(errorDiv).toHaveClass('custom-class');
    expect(errorDiv).toHaveClass('mt-6');
    expect(errorDiv).toHaveClass('p-4');
    expect(errorDiv).toHaveClass('bg-red-50');
    expect(errorDiv).toHaveClass('border');
    expect(errorDiv).toHaveClass('border-red-200');
    expect(errorDiv).toHaveClass('rounded-md');
  });

  it('should have proper text styling', () => {
    render(<ErrorDisplay error="Test error" />);
    
    const errorText = screen.getByText('Error: Test error');
    expect(errorText).toHaveClass('text-sm');
    expect(errorText).toHaveClass('text-red-800');
  });
});