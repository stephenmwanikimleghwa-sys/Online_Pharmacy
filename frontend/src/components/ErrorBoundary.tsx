import React, { ErrorInfo } from 'react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Log to console; could be extended to an external logging service
    console.error('ErrorBoundary caught an error', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-4 bg-red-50 text-red-800 rounded">
          <h3 className="font-semibold">Something went wrong</h3>
          <p className="text-sm mt-2">The inventory UI failed to render. You can retry or refresh the page.</p>
          <div className="mt-3">
            <button
              className="px-3 py-1 bg-red-600 text-white rounded mr-2"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Retry
            </button>
            <button
              className="px-3 py-1 bg-gray-200 rounded"
              onClick={() => window.location.reload()}
            >
              Reload page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
