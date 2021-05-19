import React, { useContext, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { autorun } from 'mobx';

import StoreContext from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import ContentView from './containers/ContentView';
import { IconSet, Toggle } from 'widgets';
import { Toolbar, ToolbarButton } from 'widgets/menus';

import { useWorkerListener } from './ThumbnailGeneration';
import { PREVIEW_WINDOW_BASENAME } from 'src/renderer';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Change window title to filename on load and when changing the selected file.
  useEffect(() => {
    return autorun(() => {
      const path =
        uiStore.firstItem >= 0 && uiStore.firstItem < fileStore.fileList.length
          ? fileStore.fileList[uiStore.firstItem].absolutePath
          : '?';
      if (uiStore.firstItem >= 0) document.title = `${path} • ${PREVIEW_WINDOW_BASENAME}`;
    });
  }, [fileStore, uiStore]);

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
    <div id="preview" className={uiStore.theme}>
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
            offLabel="Details"
          />
        </Toolbar>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

PreviewApp.displayName = 'PreviewApp';

export default PreviewApp;
