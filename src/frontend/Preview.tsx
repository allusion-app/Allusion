import React, { useEffect, useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { action, autorun } from 'mobx';

import { useStore } from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import ContentView from './containers/ContentView';
import { IconSet, Toggle } from 'widgets';
import { Toolbar, ToolbarButton } from 'widgets/menus';

import { useWorkerListener } from './ThumbnailGeneration';
import { comboMatches, getKeyCombo, parseKeyCombo } from './hotkeyParser';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useStore();

  // Change window title to filename on load and when changing the selected file.
  useEffect(() => {
    return autorun(() => {
      const path =
        uiStore.firstItem >= 0 && uiStore.firstItem < fileStore.fileList.length
          ? fileStore.fileList[uiStore.firstItem].absolutePath
          : '?';
      document.title = `${path} • Allusion Quick View`;
    });
  }, [fileStore, uiStore]);

  useEffect(() => {
    const handleClose = action((e: KeyboardEvent) => {
      const isHotkey = comboMatches(
        getKeyCombo(e),
        parseKeyCombo(uiStore.preferences.hotkeyMap.openPreviewWindow),
      );

      if (isHotkey || e.key === 'Escape') {
        e.preventDefault();
        window.close();
      }
    });
    window.addEventListener('keydown', handleClose);

    uiStore.enableSlideMode();
    uiStore.closeInspector();

    return () => window.removeEventListener('keydown', handleClose);
  }, [uiStore]);

  // Listen to responses of Web Workers
  useWorkerListener();

  const handleLeftButton = useCallback(
    () => uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1)),
    [uiStore],
  );

  const handleRightButton = useCallback(
    () => uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileStore.fileList.length - 1)),
    [fileStore.fileList.length, uiStore],
  );

  return (
    <div id="preview" className={uiStore.preferences.theme}>
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
