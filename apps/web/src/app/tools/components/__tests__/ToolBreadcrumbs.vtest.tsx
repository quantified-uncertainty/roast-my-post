import { vi, describe, it, expect } from 'vitest';
import React from 'react';
import { render, screen } from '@testing-library/react';
import { ToolBreadcrumbs } from '../ToolBreadcrumbs';

// Mock Next.js Link component
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('ToolBreadcrumbs', () => {
  it('should render breadcrumbs for docs page', () => {
    render(
      <ToolBreadcrumbs 
        toolId="test-tool" 
        toolName="Test Tool" 
        currentPage="docs" 
      />
    );

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('Documentation')).toBeInTheDocument();
  });

  it('should render breadcrumbs for try page', () => {
    render(
      <ToolBreadcrumbs 
        toolId="test-tool" 
        toolName="Test Tool" 
        currentPage="try" 
      />
    );

    expect(screen.getByText('Tools')).toBeInTheDocument();
    expect(screen.getByText('Test Tool')).toBeInTheDocument();
    expect(screen.getByText('Try It')).toBeInTheDocument();
  });

  it('should have correct links', () => {
    render(
      <ToolBreadcrumbs 
        toolId="test-tool" 
        toolName="Test Tool" 
        currentPage="try" 
      />
    );

    const homeLink = screen.getByRole('link', { name: '' }); // Home icon link
    const toolsLink = screen.getByRole('link', { name: 'Tools' });
    const toolLink = screen.getByRole('link', { name: 'Test Tool' });

    expect(homeLink).toHaveAttribute('href', '/');
    expect(toolsLink).toHaveAttribute('href', '/tools');
    expect(toolLink).toHaveAttribute('href', '/tools/test-tool/docs');
  });
});