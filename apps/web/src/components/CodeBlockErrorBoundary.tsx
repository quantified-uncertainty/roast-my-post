"use client";

import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class CodeBlockErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  override componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('CodeBlock error:', error, errorInfo);
  }

  override render() {
    if (this.state.hasError) {
      return (
        <div className="my-4 rounded-lg border border-red-300 bg-red-50 p-4">
          <p className="text-sm text-red-700">
            Error rendering code block. The code is still available below:
          </p>
          <pre className="mt-2 overflow-x-auto rounded bg-gray-100 p-2 text-xs">
            <code>{this.props.children}</code>
          </pre>
        </div>
      );
    }

    return this.props.children;
  }
}