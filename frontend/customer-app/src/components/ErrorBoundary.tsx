'use client';

import React, { Component, ReactNode } from 'react';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
  componentName?: string;
}

interface State {
  hasError: boolean;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(_: Error): State {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error(`[ErrorBoundary] Caught error in ${this.props.componentName || 'component'}:`, error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }
      return (
        <div className="p-4 bg-red-50 text-red-600 rounded-lg text-sm border border-red-200">
          <p className="font-semibold">⚠️ Có lỗi xảy ra khi tải module này.</p>
          <p className="opacity-80">Hệ thống đang sử dụng chế độ dự phòng. Bạn vẫn có thể tiếp tục thao tác.</p>
          <button 
            onClick={() => this.setState({ hasError: false })}
            className="mt-2 text-xs bg-red-100 px-3 py-1 rounded hover:bg-red-200"
          >
            Thử tải lại
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
