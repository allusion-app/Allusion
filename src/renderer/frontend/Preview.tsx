import React, { useContext, useEffect, useCallback } from 'react';
import { Button } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';
import ErrorBoundary from './components/ErrorBoundary';
import ContentView from './containers/ContentView';
import { Switch } from 'components';
import IconSet from 'components/Icons';
import { useWorkerListener } from './ThumbnailGeneration';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const themeClass = `app-theme ${uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light'}`;

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
    <div id="layoutContainer" className={themeClass} style={{ height: '100%' }}>
      <ErrorBoundary>
        <div id="toolbar" style={{ height: '2.4rem' }}>
          <section id="preview-toolbar">
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
          </section>
        </div>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

export default PreviewApp;
