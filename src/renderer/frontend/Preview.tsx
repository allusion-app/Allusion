import React, { useContext, useEffect, useCallback } from 'react';
import { Button } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';
import ErrorBoundary from './components/ErrorBoundary';
import ContentView from './containers/ContentView';
import { Toggle } from 'components';
import IconSet from 'components/Icons';
import { useWorkerListener } from './ThumbnailGeneration';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  // Listen to responses of Web Workers
  useWorkerListener();

  useEffect(uiStore.view.enableSlideMode, []);

  const handleLeftButton = useCallback(
    () => uiStore.view.setFirstItem(Math.max(0, uiStore.view.firstItem - 1)),
    [uiStore.view],
  );

  const handleRightButton = useCallback(
    () =>
      uiStore.view.setFirstItem(
        Math.min(uiStore.view.firstItem + 1, fileStore.fileList.length - 1),
      ),
    [fileStore.fileList.length, uiStore.view],
  );

  return (
    <div id="layoutContainer" className={`${themeClass}`} style={{ height: '100%' }}>
      <ErrorBoundary>
        <div id="toolbar" style={{ height: '2.4rem' }}>
          <section id="preview-toolbar">
            <Button
              icon={IconSet.ARROW_LEFT}
              onClick={handleLeftButton}
              minimal
              disabled={uiStore.view.firstItem === 0}
            />
            <Button
              icon={IconSet.ARROW_RIGHT}
              onClick={handleRightButton}
              minimal
              disabled={uiStore.view.firstItem === fileStore.fileList.length - 1}
            />
            <Toggle
              label="Overview"
              onChange={uiStore.view.toggleSlideMode}
              checked={!uiStore.view.isSlideMode}
            />
          </section>
        </div>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

export default PreviewApp;
