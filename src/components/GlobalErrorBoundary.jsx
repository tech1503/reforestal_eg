import React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, RefreshCcw, Home } from 'lucide-react';

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error("Uncaught error:", error, errorInfo);
    // Here you would typically send this to Sentry or your logging service
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null });
    window.location.reload();
  };

  handleGoHome = () => {
    window.location.href = '/';
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen w-full flex flex-col items-center justify-center bg-slate-950 text-slate-100 p-4">
          <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-lg p-8 shadow-2xl text-center space-y-6">
            <div className="mx-auto w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-red-500" />
            </div>
            
            <div className="space-y-2">
              <h1 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
              <p className="text-slate-400 text-sm">
                We've encountered an unexpected error. Our team has been notified.
              </p>
            </div>

            {process.env.NODE_ENV !== 'production' && this.state.error && (
              <div className="text-left bg-slate-950 p-4 rounded text-xs font-mono text-red-400 overflow-auto max-h-32 border border-red-900/50">
                {this.state.error.toString()}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-3 pt-4">
              <Button 
                onClick={this.handleReset} 
                className="flex-1 gap-2 bg-cyan-600 hover:bg-cyan-700 text-white"
              >
                <RefreshCcw className="w-4 h-4" />
                Reload Page
              </Button>
              <Button 
                variant="outline" 
                onClick={this.handleGoHome}
                className="flex-1 gap-2 border-slate-700 hover:bg-slate-800 text-slate-200"
              >
                <Home className="w-4 h-4" />
                Go Home
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;