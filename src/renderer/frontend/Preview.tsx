import React, { useContext, useEffect, useCallback } from 'react';
import { Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';
import ErrorBoundary from './components/ErrorBoundary';
import ContentView from './containers/ContentView';
import IconSet from 'components/Icons';
import { useWorkerListener } from './ThumbnailGeneration';
import { Toolbar, ToolbarGroup, ToolbarButton } from 'components';

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
        <Toolbar id="toolbar" label="Preview Command Bar" controls="gallery">
          <ToolbarGroup>
            <ToolbarButton
              showLabel="never"
              icon={IconSet.ARROW_LEFT}
              label="Previous Image"
              onClick={handleLeftButton}
              disabled={uiStore.firstItem === 0}
            />
            <ToolbarButton
              showLabel="never"
              icon={IconSet.ARROW_RIGHT}
              label="Next Image"
              onClick={handleRightButton}
              disabled={uiStore.firstItem === fileStore.fileList.length - 1}
            />
            <Switch
              label="Overview"
              onChange={uiStore.toggleSlideMode}
              checked={!uiStore.isSlideMode}
            />
          </ToolbarGroup>
        </Toolbar>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

export default PreviewApp;
