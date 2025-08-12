/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { SubmitButton } from '../SubmitButton';

describe('SubmitButton', () => {
  it('should render with default props', () => {
    render(<SubmitButton isLoading={false} />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveTextContent('Submit');
    expect(button).not.toBeDisabled();
    expect(button).toHaveAttribute('type', 'submit');
  });

  it('should show loading text when isLoading is true', () => {
    render(<SubmitButton isLoading={true} />);
    
    expect(screen.getByRole('button')).toHaveTextContent('Processing...');
  });

  it('should show custom text and loading text', () => {
    render(
      <SubmitButton 
        isLoading={false} 
        text="Check Math"
        loadingText="Checking..."
      />
    );
    
    expect(screen.getByRole('button')).toHaveTextContent('Check Math');
    
    // Re-render with loading
    render(
      <SubmitButton 
        isLoading={true} 
        text="Check Math"
        loadingText="Checking..."
      />
    );
    
    expect(screen.getAllByRole('button')[1]).toHaveTextContent('Checking...');
  });

  it('should be disabled when isLoading is true', () => {
    render(<SubmitButton isLoading={true} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when disabled prop is true', () => {
    render(<SubmitButton isLoading={false} disabled={true} />);
    
    expect(screen.getByRole('button')).toBeDisabled();
  });

  it('should be disabled when either isLoading or disabled is true', () => {
    render(<SubmitButton isLoading={true} disabled={false} />);
    expect(screen.getByRole('button')).toBeDisabled();
    
    render(<SubmitButton isLoading={false} disabled={true} />);
    expect(screen.getAllByRole('button')[1]).toBeDisabled();
  });

  it('should call onClick when clicked', () => {
    const handleClick = jest.fn();
    render(<SubmitButton isLoading={false} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('should not call onClick when disabled', () => {
    const handleClick = jest.fn();
    render(<SubmitButton isLoading={false} disabled={true} onClick={handleClick} />);
    
    fireEvent.click(screen.getByRole('button'));
    
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('should apply custom className', () => {
    render(<SubmitButton isLoading={false} className="custom-class" />);
    
    const button = screen.getByRole('button');
    expect(button).toHaveClass('custom-class');
    expect(button).toHaveClass('w-full');
    expect(button).toHaveClass('bg-indigo-600');
  });

  it('should support different button types', () => {
    render(<SubmitButton isLoading={false} type="button" />);
    expect(screen.getByRole('button')).toHaveAttribute('type', 'button');
    
    render(<SubmitButton isLoading={false} type="reset" />);
    expect(screen.getAllByRole('button')[1]).toHaveAttribute('type', 'reset');
  });
});