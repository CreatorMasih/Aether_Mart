import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({
      error,
      errorInfo,
    });
    // Log error to monitoring services (e.g., Sentry, LogRocket)
    console.error('Uncaught error inside ErrorBoundary:', error, errorInfo);
  }

  private handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <div className="min-h-screen w-full flex items-center justify-center bg-bg-primary p-6">
          <div className="w-full max-w-md p-8 rounded-xl border border-border-primary bg-bg-secondary shadow-high text-center">
            <div className="inline-flex items-center justify-center p-3 rounded-full bg-status-error/10 text-status-error mb-4">
              <AlertTriangle className="h-8 w-8" aria-hidden="true" />
            </div>
            
            <h1 className="text-2xl font-bold tracking-tight text-text-primary mb-2">
              Something went wrong
            </h1>
            
            <p className="text-sm text-text-secondary mb-6">
              We encountered a runtime crash. Please try reloading the application. If the problem persists, contact our engineering support.
            </p>

            {this.state.error && (
              <div className="text-left mb-6 p-4 rounded-lg bg-bg-tertiary border border-border-primary overflow-x-auto max-h-40">
                <p className="font-mono text-xs text-status-error font-semibold">
                  {this.state.error.toString()}
                </p>
                {this.state.errorInfo && (
                  <pre className="font-mono text-[10px] text-text-secondary mt-2 leading-relaxed">
                    {this.state.errorInfo.componentStack}
                  </pre>
                )}
              </div>
            )}

            <button
              onClick={this.handleReset}
              className="w-full py-3 px-4 inline-flex items-center justify-center gap-2 rounded-lg bg-brand-emerald text-white hover:bg-brand-emerald-hover font-medium transition-all focus:ring-2 focus:ring-brand-emerald focus:ring-offset-2 cursor-pointer"
            >
              <RotateCw className="h-4 w-4" />
              Reload App
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
export default ErrorBoundary;
