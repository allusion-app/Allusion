import React, { useContext, useState } from 'react';
import { remote, shell } from 'electron';
import { NonIdealState, EditableText, Popover } from '@blueprintjs/core';
import { githubUrl } from '../../../config';
import IconSet from 'components/Icons';
import { Button, ButtonGroup, DialogActions, DialogButton } from 'components';

import { mapStackTrace } from 'sourcemapped-stacktrace';
import StoreContext from '../contexts/StoreContext';

export const ClearDbButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const rootStore = useContext(StoreContext);

  return (
    <Popover isOpen={isOpen}>
      <Button
        styling="outlined"
        icon={IconSet.CLEAR_DATABASE}
        label="Clear Database"
        onClick={() => setIsOpen(!isOpen)}
      />
      <div className="dialog-content" style={{ padding: '8px', maxWidth: '45ch' }}>
        <h2 className="dialog-label">Are you sure you want to clear the database?</h2>
        <div className="dialog-information">
          <p>
            This is intended as a last resort. All imported images and created tags will be
            permanently removed.
          </p>
          <p>This will not delete your images on your system!</p>
        </div>
        <div className="dialog-footer">
          <DialogActions
            closeButtonText="Cancel"
            primaryButtonText="Clear"
            onClick={(button) =>
              button === DialogButton.CloseButton ? setIsOpen(false) : rootStore.clearDatabase()
            }
          />
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
            icon={<span className="custom-icon-64">{IconSet.DB_ERROR}</span>}
            title="Something went wrong."
            description="You can try one of the following options or contact the maintainers"
            action={
              <ButtonGroup>
                <Button
                  onClick={this.reloadApplication}
                  styling="outlined"
                  icon={IconSet.RELOAD}
                  label="Reload"
                />
                <Button
                  onClick={this.viewInspector}
                  styling="outlined"
                  icon={IconSet.CHROME_DEVTOOLS}
                  label="View in DevTools"
                />
                <ClearDbButton />
                <Button
                  styling="outlined"
                  onClick={this.openIssueURL}
                  icon={IconSet.GITHUB}
                  label="Create Issue"
                />
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
