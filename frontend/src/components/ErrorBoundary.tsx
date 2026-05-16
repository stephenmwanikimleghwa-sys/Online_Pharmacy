import React, { Component, ErrorInfo, ReactNode } from 'react';
import { ExclamationTriangleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null
    };
  }

  static getDerivedStateFromError(error: Error): State {
    return {
      hasError: true,
      error,
      errorInfo: null
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo
    });

    console.error('Error caught by boundary:', error, errorInfo);
    this.props.onError?.(error, errorInfo);
  }

  handleReset = () => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null
    });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="page-bg flex items-center justify-center px-4">
          <div className="max-w-md w-full glass-card p-8 text-center">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-6"
              style={{ background: 'rgba(244,63,94,0.1)' }}>
              <ExclamationTriangleIcon className="h-8 w-8" style={{ color: '#f43f5e' }} />
            </div>

            <h1 className="text-2xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
              Something went wrong
            </h1>

            <p className="mb-6" style={{ color: 'var(--text-secondary)' }}>
              We encountered an unexpected error. Please try again or contact support if the problem persists.
            </p>

            {import.meta.env.DEV && this.state.error && (
              <details className="mb-6 text-left">
                <summary className="cursor-pointer text-sm font-medium mb-2" style={{ color: 'var(--text-primary)' }}>
                  Error Details
                </summary>
                <div className="mt-2 p-4 rounded-lg overflow-auto max-h-48"
                  style={{ background: 'var(--bg-field)', border: '1px solid var(--border-primary)' }}>
                  <p className="text-xs font-mono mb-2" style={{ color: '#f87171' }}>
                    {this.state.error.toString()}
                  </p>
                  {this.state.errorInfo && (
                    <pre className="text-xs whitespace-pre-wrap" style={{ color: 'var(--text-secondary)' }}>
                      {this.state.errorInfo.componentStack}
                    </pre>
                  )}
                </div>
              </details>
            )}

            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                onClick={this.handleReset}
                className="btn-primary inline-flex items-center justify-center gap-2 px-6 py-3 text-white font-medium rounded-xl transition-all focus:outline-none"
              >
                <ArrowPathIcon className="h-5 w-5" />
                Try Again
              </button>
              <button
                onClick={() => window.location.href = '/'}
                className="form-cancel-btn inline-flex items-center justify-center px-6 py-3 font-medium rounded-xl"
              >
                Go Home
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

// HOC for wrapping components with error boundary
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  fallback?: ReactNode
) {
  return function WithErrorBoundaryWrapper(props: P) {
    return (
      <ErrorBoundary fallback={fallback}>
        <Component {...props} />
      </ErrorBoundary>
    );
  };
}

export default ErrorBoundary;
