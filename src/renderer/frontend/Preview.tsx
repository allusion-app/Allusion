import React, { useContext, useEffect, useCallback } from 'react';
import { Button, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';
import ErrorBoundary from './components/ErrorBoundary';
import ContentView from './containers/ContentView';
import IconSet from 'components/Icons';
import { useWorkerListener } from './ThumbnailGeneration';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  // Listen to responses of Web Workers
  useWorkerListener();

  useEffect(() => uiStore.enableSlideMode(), [uiStore]);

  const handleLeftButton = useCallback(
    () => uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1)),
    [uiStore],
  );

  const handleRightButton = useCallback(
    () => uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileStore.fileList.length - 1)),
    [fileStore.fileList.length, uiStore],
  );

  return (
    <div id="preview" className={themeClass}>
      <ErrorBoundary>
        <div id="toolbar">
          <Button
            icon={IconSet.ARROW_LEFT}
            onClick={handleLeftButton}
            minimal
            disabled={uiStore.firstItem === 0}
          />
          <Button
            icon={IconSet.ARROW_RIGHT}
            onClick={handleRightButton}
            minimal
            disabled={uiStore.firstItem === fileStore.fileList.length - 1}
          />
          <Switch
            label="Overview"
            onChange={uiStore.toggleSlideMode}
            checked={!uiStore.isSlideMode}
          />
        </div>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

export default PreviewApp;
