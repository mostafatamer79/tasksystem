'use client';

import { Component, type ReactNode } from 'react';
import { Button } from '@/components/ui/button';
import { TriangleAlert } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  message?: string;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex min-h-[40vh] flex-col items-center justify-center gap-3 text-center">
          <div className="rounded-full bg-destructive/10 p-3 text-destructive">
            <TriangleAlert className="h-6 w-6" />
          </div>
          <p className="text-lg font-semibold">Something went wrong</p>
          <p className="max-w-md text-sm text-muted-foreground">
            {this.state.message || 'An unexpected error occurred while rendering this view.'}
          </p>
          <Button variant="outline" onClick={() => this.setState({ hasError: false, message: undefined })}>
            Try again
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}
