import React, { useContext } from 'react';
import { remote, shell } from 'electron';
import {
  Button,
  NonIdealState,
  ButtonGroup,
  EditableText,
  Popover,
  H5,
  Classes,
  Position,
} from '@blueprintjs/core';
import { githubUrl } from '../../../config';
import IconSet from 'components/Icons';

import { mapStackTrace } from 'sourcemapped-stacktrace';
import StoreContext from '../contexts/StoreContext';
import { IButtonProps } from '@blueprintjs/core/lib/esm/components/button/abstractButton';

export const ClearDbButton = (props: IButtonProps & { position?: Position }) => {
  const rootStore = useContext(StoreContext);

  return (
    <Popover
      position={props.position}
      targetClassName={props.fill ? 'fillWidth' : ''}
      // Portal doesn't work in new window https://github.com/palantir/blueprint/issues/3248
      usePortal={false}
    >
      <Button {...props} intent="danger" icon={IconSet.CLEAR_DATABASE}>
        Clear database
      </Button>
      <div style={{ padding: '8px', maxWidth: '400px' }}>
        <H5>Confirm</H5>
        <p>Are you sure you want to clear the database?</p>
        <p>
          This is intended to be a last resort, as all imported images and created tags you will be
          permanently removed.
        </p>
        <p>No images on your system will be deleted.</p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 15 }}>
          <Button className={Classes.POPOVER_DISMISS} style={{ marginRight: 10 }}>
            Cancel
          </Button>
          <Button
            intent="danger"
            className={Classes.POPOVER_DISMISS}
            onClick={rootStore.clearDatabase}
          >
            Clear
          </Button>
        </div>
      </div>
    </Popover>
  );
};

interface IErrorBoundaryProps {
  children: React.ReactNode;
}

interface IErrorBoundaryState {
  hasError: boolean;
  error: string;
}

class ErrorBoundary extends React.Component<IErrorBoundaryProps, IErrorBoundaryState> {
  static getDerivedStateFromError(error: any) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true, error };
  }

  state = {
    hasError: false,
    error: '',
  };

  constructor(props: IErrorBoundaryProps) {
    super(props);
    this.openIssueURL = this.openIssueURL.bind(this);
  }

  componentDidCatch(error: Error) {
    // TODO: Send error to logging service

    // Map compiled error to source code
    mapStackTrace(error.stack, (sourceMappedStack: string[]) => {
      this.setState({
        error: [
          error.message,
          ...sourceMappedStack.filter((line) => line.indexOf('bundle.js') === -1),
        ].join('\n'),
      });
    });
  }

  viewInspector() {
    remote.getCurrentWebContents().openDevTools();
  }

  reloadApplication() {
    remote.getCurrentWindow().reload();
  }

  openIssueURL() {
    const encodedBody = encodeURIComponent(`<!--- Please check if your issue is not a duplicate before posting -->
<b>Which actions did you perform before the error occurred?</b>
...

<b>What did you expect to happen?</b>
...

<b>Stacktrace</b>
\`\`\`
${this.state.error}
\`\`\``);
    const url = `${githubUrl}/issues/new?body=${encodedBody}`;
    shell.openExternal(url);
  }

  render() {
    const { hasError, error } = this.state;
    if (hasError) {
      // You can render any custom fallback UI
      return (
        <div className="error-boundary">
          <NonIdealState
            icon={<span className="bp3-icon custom-icon custom-icon-64">{IconSet.DB_ERROR}</span>}
            title="Something went wrong."
            description="You can try one of the following options or contact the maintainers"
            action={
              <ButtonGroup>
                <Button onClick={this.reloadApplication} intent="primary" icon={IconSet.RELOAD}>
                  Reload
                </Button>
                <Button
                  onClick={this.viewInspector}
                  intent="warning"
                  icon={IconSet.CHROME_DEVTOOLS}
                >
                  View in DevTools
                </Button>
                <ClearDbButton position="bottom" />
                <Button onClick={this.openIssueURL} icon={IconSet.GITHUB}>
                  Create issue
                </Button>
              </ButtonGroup>
            }
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
