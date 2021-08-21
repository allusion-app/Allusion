import React, { useEffect, useCallback, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import ContentView from './containers/ContentView';
import { IconSet, Toggle } from 'widgets';
import { Toolbar, ToolbarButton } from 'widgets/menus';

import { useWorkerListener } from './ThumbnailGeneration';
import { Tooltip } from './containers/AppToolbar/PrimaryCommands';

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

  return (
    <div
      id="preview"
      className={`${uiStore.theme} ${isInitializing ? 'preview-window-initializing' : ''}`}
    >
      <ErrorBoundary>
        <Toolbar id="toolbar" label="Preview Command Bar" controls="content-view">
          <ToolbarButton
            showLabel="never"
            icon={IconSet.ARROW_LEFT}
            text="Previous Image"
            onClick={handleLeftButton}
            disabled={uiStore.firstItem === 0}
          />
          <ToolbarButton
            showLabel="never"
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
            showLabel="never"
            icon={IconSet.INFO}
            onClick={uiStore.toggleInspector}
            checked={uiStore.isInspectorOpen}
            text={Tooltip.Inspector}
            tooltip={Tooltip.Inspector}
          />
        </Toolbar>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

PreviewApp.displayName = 'PreviewApp';

export default PreviewApp;
