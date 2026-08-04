import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { IconSet, Toggle } from 'widgets';
import { ContextMenuLayer } from 'widgets/menus';
import { Toolbar, ToolbarButton } from 'widgets/toolbar';
import ContentView from './containers/ContentView';
import ErrorBoundary from './containers/ErrorBoundary';
import { useStore } from './contexts/StoreContext';
import { useWorkerListener } from './image/ThumbnailGeneration';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useStore();
  const { t } = useTranslation();

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
        <Toolbar
          id="toolbar"
          label={t('app.more', 'Preview Command Bar')}
          controls="content-view"
          isCompact
        >
          <ToolbarButton
            icon={IconSet.ARROW_LEFT}
            text={t('button.previousImage', 'Previous Image')}
            onClick={handleLeftButton}
            disabled={uiStore.firstItem === 0}
          />
          <ToolbarButton
            icon={IconSet.ARROW_RIGHT}
            text={t('button.nextImage', 'Next Image')}
            onClick={handleRightButton}
            disabled={uiStore.firstItem === fileStore.fileList.length - 1}
          />
          <Toggle onChange={uiStore.toggleSlideMode} checked={!uiStore.isSlideMode}>
            {t('button.fullSize', 'Full size')}
          </Toggle>

          <div className="spacer" />

          <ToolbarButton
            icon={IconSet.INFO}
            onClick={uiStore.toggleInspector}
            checked={uiStore.isInspectorOpen}
            text={t('button.toggleInspector', 'Toggle the inspector panel')}
            tooltip={t('button.toggleInspector', 'Toggle the inspector panel')}
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
