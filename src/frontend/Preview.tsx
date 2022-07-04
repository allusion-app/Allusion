import React, { useEffect, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import ContentView from './containers/ContentView';
import { IconSet, Toggle } from 'widgets';
import { ContextMenuLayer, Toolbar, ToolbarButton } from 'widgets/menus';

import { useWorkerListener } from './image/ThumbnailGeneration';
import SplashScreen from './containers/SplashScreen';
import { useAction, useAutorun, useComputed } from './hooks/mobx';

const PREVIEW_WINDOW_BASENAME = 'Allusion Quick View';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useStore();

  useAutorun(() => {
    const file = fileStore.fileIndex.at(uiStore.firstItem) ?? fileStore.fileIndex.at(0);
    if (uiStore.isSlideMode && file !== undefined) {
      document.title = `${file.absolutePath} • ${PREVIEW_WINDOW_BASENAME}`;
    } else {
      document.title = PREVIEW_WINDOW_BASENAME;
    }
  });

  // Listen to responses of Web Workers
  useWorkerListener();

  useEffect(() => uiStore.enableSlideMode(), [uiStore]);

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
        <PreviewToolbar />
        <ContextMenuLayer>
          <ContentView />
        </ContextMenuLayer>
      </ErrorBoundary>
    </div>
  );
});

const PreviewToolbar = observer(() => {
  const { uiStore, fileStore } = useStore();

  const isFirst = useComputed(() => fileStore.fileIndex.isEmpty || uiStore.firstItem === 0);

  const isLast = useComputed(
    () => fileStore.fileIndex.isEmpty || uiStore.firstItem === fileStore.fileList.length - 1,
  );

  const handleLeftButton = useAction(() => {
    uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1));
  });

  const handleRightButton = useAction(() => {
    uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileStore.fileList.length - 1));
  });

  return (
    <Toolbar id="toolbar" label="Preview Command Bar" controls="content-view" isCompact>
      <ToolbarButton
        icon={IconSet.ARROW_LEFT}
        text="Previous Image"
        onClick={handleLeftButton}
        disabled={isFirst.get()}
      />
      <ToolbarButton
        icon={IconSet.ARROW_RIGHT}
        text="Next Image"
        onClick={handleRightButton}
        disabled={isLast.get()}
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
  );
});

PreviewApp.displayName = 'PreviewApp';

export default PreviewApp;
