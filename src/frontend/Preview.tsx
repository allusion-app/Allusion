import React, { useEffect, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import ContentView from './containers/ContentView';
import { IconSet, Toggle } from 'widgets';
import { ContextMenuLayer, Toolbar, ToolbarButton } from 'widgets/menus';

import { useWorkerListener } from './image/ThumbnailGeneration';
import SplashScreen from './containers/SplashScreen';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useStore();

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

  // disable fade-in on initalization (when file list changes)
  const [isInitializing, setIsInitializing] = useState(true);
  useEffect(() => {
    setIsInitializing(true);
    setTimeout(() => setIsInitializing(false), 1000);
  }, [fileStore.fileListLastModified]);

  if (!uiStore.isInitialized) {
    return <SplashScreen />;
  }

  return (
    <div
      id="preview"
      className={`${uiStore.theme} ${isInitializing ? 'preview-window-initializing' : ''}`}
    >
      <ErrorBoundary>
        <Toolbar id="toolbar" label="Preview Command Bar" controls="content-view" isCompact>
          <ToolbarButton
            icon={IconSet.ARROW_LEFT}
            text="Previous Image"
            onClick={handleLeftButton}
            disabled={uiStore.firstItem === 0}
          />
          <ToolbarButton
            icon={IconSet.ARROW_RIGHT}
            text="Next Image"
            onClick={handleRightButton}
            disabled={uiStore.firstItem === fileStore.fileList.length - 1}
          />
          <Toggle
            onChange={uiStore.toggleSlideMode}
            checked={!uiStore.isSlideMode}
            onLabel="Overview"
            offLabel="Full size"
          />

          <div className="spacer" />

          <ToolbarButton
            icon={IconSet.INFO}
            onClick={uiStore.toggleInspector}
            checked={uiStore.isInspectorOpen}
            text="Toggle the inspector panel"
            tooltip="Toggle the inspector panel"
          />
        </Toolbar>

        <ContextMenuLayer>
          <ContentView />
        </ContextMenuLayer>
      </ErrorBoundary>
    </div>
  );
});

PreviewApp.displayName = 'PreviewApp';

export default PreviewApp;
