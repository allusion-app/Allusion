import React, { useContext, useState } from 'react';
import { shell } from 'electron';
import { mapStackTrace } from 'sourcemapped-stacktrace';

import { RendererMessenger } from 'src/Messaging';
import { githubUrl } from 'src/config';

import StoreContext from '../contexts/StoreContext';

import { Button, ButtonGroup, IconSet } from 'widgets';
import { DialogActions, DialogButton, Flyout, Dialog } from 'widgets/popovers';

export const ClearDbButton = () => {
  const [isOpen, setIsOpen] = useState(false);
  const rootStore = useContext(StoreContext);

  return (
    <Flyout
      isOpen={isOpen}
      cancel={() => setIsOpen(false)}
      placement="top"
      target={
        <Button
          styling="outlined"
          icon={IconSet.CLEAR_DATABASE}
          text="Clear Database"
          onClick={() => setIsOpen(!isOpen)}
        />
      }
    >
      <div role='alertdialog' className="dialog-content" style={{ padding: '8px', maxWidth: '45ch' }}>
        <h2 className="dialog-title">Are you sure you want to clear the database?</h2>
        <div className="dialog-information">
          <p>
            This is intended as a last resort. All imported images and created tags will be
            permanently removed.
          </p>
          <p>This will not delete your images on your system!</p>
        </div>
        <div className="dialog-footer">
          <DialogActions
            primaryButtonText="Clear"
            closeButtonText="Cancel"
            defaultButton={DialogButton.PrimaryButton}
            onClick={async (button) => {
              if (button === DialogButton.CloseButton) {
                setIsOpen(false);
              } else {
                await rootStore.clearDatabase();
                rootStore.uiStore.closeSettings();
              }
            }}
          />
        </div>
      </div>
    </Flyout>
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
    RendererMessenger.toggleDevTools();
  }

  reloadApplication() {
    RendererMessenger.reload();
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
          <span className="custom-icon-64">{IconSet.DB_ERROR}</span>
          <h2>Something went wrong</h2>
          <p>You can try one of the following options or contact the maintainers.</p>
          <ButtonGroup>
            <Button
              onClick={this.reloadApplication}
              styling="outlined"
              icon={IconSet.RELOAD}
              text="Reload"
            />
            <Button
              onClick={this.viewInspector}
              styling="outlined"
              icon={IconSet.CHROME_DEVTOOLS}
              text="Toggle DevTools"
            />
            <ClearDbButton />
            <Button
              styling="outlined"
              onClick={this.openIssueURL}
              icon={IconSet.GITHUB}
              text="Create Issue"
            />
          </ButtonGroup>
          <p className="message">{error.toString()}</p>
        </div>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
