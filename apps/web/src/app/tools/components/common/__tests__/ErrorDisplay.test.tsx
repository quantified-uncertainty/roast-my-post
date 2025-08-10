import React from 'react';
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

  it('should render with correct styling', () => {
    render(<ErrorDisplay error="Styling test" />);
    
    const errorText = screen.getByText('Error: Styling test');
    expect(errorText).toHaveClass('text-red-800');
  });
});