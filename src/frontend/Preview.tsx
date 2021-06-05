import React, { useContext, useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import ContentView from './containers/ContentView';
import { IconSet, Toggle } from 'widgets';
import { Toolbar, ToolbarButton } from 'widgets/menus';

import { useWorkerListener } from './ThumbnailGeneration';
import { Tooltip } from './containers/AppToolbar/PrimaryCommands';
import { SlideImageControls } from './containers/ContentView/SlideMode';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);

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
            offLabel="Full size"
          />

          <div className="spacer" />

          <SlideImageControls />

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
