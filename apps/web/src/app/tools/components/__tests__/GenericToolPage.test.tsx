/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { GenericToolPage } from '../GenericToolPage';
import { runToolWithAuth } from '../../utils/runToolWithAuth';

// Mock dependencies
jest.mock('../../utils/runToolWithAuth');
jest.mock('@roast/ai', () => ({
  toolSchemas: {
    'test-tool': {
      inputSchema: {},
      outputSchema: {}
    }
  },
  getToolReadme: jest.fn(() => '# Test Tool README')
}));

const mockRunToolWithAuth = runToolWithAuth as jest.MockedFunction<typeof runToolWithAuth>;

describe('GenericToolPage', () => {
  const defaultProps = {
    toolId: 'test-tool' as keyof typeof import('@roast/ai').toolSchemas,
    title: 'Test Tool',
    description: 'A test tool for testing',
    icon: <div>Icon</div>,
    fields: [
      {
        type: 'text' as const,
        name: 'testField',
        label: 'Test Field',
        required: true
      }
    ],
    renderResult: (result: any) => <div>Result: {JSON.stringify(result)}</div>
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render the tool with basic fields', () => {
    render(<GenericToolPage {...defaultProps} />);
    
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('A test tool for testing')).toBeInTheDocument();
    expect(screen.getByLabelText(/Test Field/)).toBeInTheDocument();
  });

  it('should render different field types', () => {
    const props = {
      ...defaultProps,
      fields: [
        {
          type: 'text' as const,
          name: 'textField',
          label: 'Text Field',
          required: true
        },
        {
          type: 'textarea' as const,
          name: 'textareaField',
          label: 'Textarea Field',
          rows: 5
        },
        {
          type: 'number' as const,
          name: 'numberField',
          label: 'Number Field',
          min: 0,
          max: 100
        },
        {
          type: 'select' as const,
          name: 'selectField',
          label: 'Select Field',
          options: [
            { value: 'option1', label: 'Option 1' },
            { value: 'option2', label: 'Option 2' }
          ]
        },
        {
          type: 'checkbox' as const,
          name: 'checkboxField',
          label: 'Checkbox Field'
        }
      ]
    };

    render(<GenericToolPage {...props} />);
    
    expect(screen.getByLabelText(/Text Field/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Textarea Field/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Number Field/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Select Field/)).toBeInTheDocument();
    expect(screen.getByLabelText(/Checkbox Field/)).toBeInTheDocument();
  });

  it('should handle form submission successfully', async () => {
    const mockResult = { success: true, data: 'test' };
    mockRunToolWithAuth.mockResolvedValueOnce(mockResult);

    render(<GenericToolPage {...defaultProps} />);
    
    const input = screen.getByLabelText(/Test Field/);
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    
    fireEvent.change(input, { target: { value: 'test value' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(mockRunToolWithAuth).toHaveBeenCalledWith(
        '/api/tools/test-tool',
        { testField: 'test value' }
      );
      expect(screen.getByText(/Result:.*success.*true/)).toBeInTheDocument();
    });
  });

  it('should handle form submission error', async () => {
    mockRunToolWithAuth.mockRejectedValueOnce(new Error('API Error'));

    render(<GenericToolPage {...defaultProps} />);
    
    const input = screen.getByLabelText(/Test Field/);
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    
    fireEvent.change(input, { target: { value: 'test value' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(screen.getByText(/Error:.*API Error/)).toBeInTheDocument();
    });
  });

  it('should validate input before submission', async () => {
    const validateInput = jest.fn((input) => {
      if (!input.testField) return 'Field is required';
      if (input.testField.length < 5) return 'Field must be at least 5 characters';
      return true;
    });

    render(
      <GenericToolPage 
        {...defaultProps} 
        validateInput={validateInput}
      />
    );
    
    const input = screen.getByLabelText(/Test Field/);
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    
    // Add input that passes basic validation but fails custom validation
    fireEvent.change(input, { target: { value: 'abc' } }); // Less than 5 characters
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      expect(validateInput).toHaveBeenCalled();
      expect(mockRunToolWithAuth).not.toHaveBeenCalled();
    });
  });

  it('should load example input when button is clicked', () => {
    const exampleInput = { testField: 'example value' };
    
    render(
      <GenericToolPage 
        {...defaultProps} 
        exampleInput={exampleInput}
        exampleText="Load Example"
      />
    );
    
    const exampleButton = screen.getByText('Load Example');
    const input = screen.getByLabelText(/Test Field/) as HTMLInputElement;
    
    fireEvent.click(exampleButton);
    
    expect(input.value).toBe('example value');
  });

  it('should display warning message when provided', () => {
    render(
      <GenericToolPage 
        {...defaultProps} 
        warning="This is a warning message"
      />
    );
    
    expect(screen.getByText('This is a warning message')).toBeInTheDocument();
  });

  it('should handle textarea with examples', () => {
    const props = {
      ...defaultProps,
      fields: [{
        type: 'textarea' as const,
        name: 'textField',
        label: 'Text Field',
        examples: ['Example 1', 'Example 2', 'Example 3']
      }]
    };

    render(<GenericToolPage {...props} />);
    
    // Check that example buttons are rendered
    expect(screen.getByText('Example 1')).toBeInTheDocument();
    expect(screen.getByText('Example 2')).toBeInTheDocument();
    expect(screen.getByText('Example 3')).toBeInTheDocument();
    
    // Click an example
    const textarea = screen.getByLabelText(/Text Field/) as HTMLTextAreaElement;
    fireEvent.click(screen.getByText('Example 2'));
    
    expect(textarea.value).toBe('Example 2');
  });

  it('should disable form during loading', async () => {
    mockRunToolWithAuth.mockImplementation(() => 
      new Promise(resolve => setTimeout(() => resolve({ success: true }), 100))
    );

    render(<GenericToolPage {...defaultProps} />);
    
    const input = screen.getByLabelText(/Test Field/);
    const submitButton = screen.getByRole('button', { name: /Submit/i });
    
    fireEvent.change(input, { target: { value: 'test value' } });
    fireEvent.click(submitButton);
    
    // Check that form is disabled during loading
    expect(input).toBeDisabled();
    expect(submitButton).toBeDisabled();
    expect(submitButton).toHaveTextContent('Processing...');
    
    await waitFor(() => {
      expect(input).not.toBeDisabled();
      expect(submitButton).not.toBeDisabled();
    });
  });

  it('should use custom submit and loading text', () => {
    render(
      <GenericToolPage 
        {...defaultProps}
        submitButtonText="Analyze"
        loadingText="Analyzing..."
      />
    );
    
    const submitButton = screen.getByRole('button', { name: /Analyze/i });
    expect(submitButton).toHaveTextContent('Analyze');
    
    // Trigger loading state
    const input = screen.getByLabelText(/Test Field/);
    fireEvent.change(input, { target: { value: 'test' } });
    fireEvent.click(submitButton);
    
    expect(submitButton).toHaveTextContent('Analyzing...');
  });
});