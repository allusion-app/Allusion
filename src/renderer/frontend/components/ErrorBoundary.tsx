import React from 'react';
import { remote } from 'electron';
import { Button, NonIdealState, ButtonGroup, EditableText } from '@blueprintjs/core';

interface IErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends React.Component<{}, IErrorBoundaryState> {
  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }
  state = {
    hasError: false,
    error: '',
  };

  componentDidCatch(error: any, info: any) {
    // TODO: Send error to logging service
    const stringifiedError = JSON.stringify(error, Object.getOwnPropertyNames(error), 2);
    this.setState({ error: stringifiedError });
  }

  viewInspector() {
    remote.getCurrentWebContents()
      .openDevTools();
  }

  reloadApplication() {
    remote.getCurrentWindow()
      .reload();
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <NonIdealState
            icon={<span>😞</span>}
            title="Something went wrong."
            description="You can try one of the following options or contact the maintainers"
            action={<ButtonGroup>
              <Button onClick={this.reloadApplication} icon="refresh" intent="primary">
                  Reload
              </Button>
              <Button onClick={this.viewInspector} intent="warning" icon="error">
                View in DevTools
              </Button>
              <Button disabled intent="danger" icon="database">
                Clear database
              </Button>
            </ButtonGroup>}
          >
            <EditableText
              className="bp3-intent-danger bp3-monospace-text message"
              value={error.toString()}
              isEditing={false}
              multiline
            />
          </NonIdealState>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
