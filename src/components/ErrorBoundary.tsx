import React, { ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

interface Props {
  children: ReactNode;
  fallbackTitle?: string;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export default class ErrorBoundary extends React.Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('MiseOS Module Crash caught in ErrorBoundary:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    // The setState call here is redundant because window.location.reload()
    // will discard the current component state anyway.
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="bg-zinc-950 border border-red-900 rounded-lg p-6 my-4 shadow-xl">
          <div className="flex items-center gap-3 text-red-500 mb-3">
            <AlertTriangle className="w-8 h-8 animate-pulse text-red-500" />
            <h3 className="text-base font-mono font-bold uppercase tracking-wider">
              {this.props.fallbackTitle || 'MiseOS Module Crash Recovery'}
            </h3>
          </div>
          <p className="text-xs text-zinc-300 font-mono mb-4 leading-relaxed">
            The platform caught an invalid computational state relative to this module. Core variables have been preserved in client-side storage.
          </p>
          <div className="bg-zinc-900 border border-zinc-805 p-3 rounded text-[10px] font-mono text-zinc-400 max-h-40 overflow-auto mb-4">
            {this.state.error?.toString() || 'Unknown Error'}
            {this.state.errorInfo?.componentStack && (
              <pre className="mt-2 whitespace-pre-wrap">{this.state.errorInfo.componentStack}</pre>
            )}
          </div>
          <button
            onClick={this.handleReset}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-mono text-xs font-bold px-4 py-2 rounded-md border border-red-500 shadow-md transition-all cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Force Hot-Reload Node
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
