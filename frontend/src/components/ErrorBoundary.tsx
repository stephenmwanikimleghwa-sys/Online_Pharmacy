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
        <div className="p-6 max-w-md mx-auto mt-12 bg-rose-50 text-rose-900 rounded-2xl border border-rose-200 shadow-sm">
          <h3 className="font-semibold text-lg">Something went wrong</h3>
          <p className="text-sm mt-2 text-rose-800">This page could not load properly. Try again or refresh the page.</p>
          <div className="mt-4 flex gap-2">
            <button
              className="px-4 py-2 bg-rose-600 text-white rounded-lg font-medium hover:bg-rose-700"
              onClick={() => this.setState({ hasError: false, error: null })}
            >
              Try again
            </button>
            <button
              className="px-4 py-2 bg-white border border-rose-200 rounded-lg font-medium hover:bg-rose-50"
              onClick={() => window.location.reload()}
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
