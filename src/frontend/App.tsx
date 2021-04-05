import React, { useCallback, useContext, useEffect, useState } from 'react';
import { observable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import HelpCenter from './containers/HelpCenter';
import SplashScreen from './containers/SplashScreen';
import { Toaster as CustomToaster } from './components/Toaster';

import AdvancedSearchDialog from './containers/AdvancedSearch';
import Outliner from './containers/Outliner';
import SettingsWindow from './containers/Settings';

import { useWorkerListener } from './ThumbnailGeneration';
import WindowTitlebar from './containers/WindowTitlebar';
import { DropContextProvider } from './contexts/DropContext';
import TagDnDContext from './contexts/TagDnDContext';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import { WindowSplitter } from 'widgets/WindowSplitter';
import Main from './containers/Main';

const SPLASH_SCREEN_TIME = 1400;
const PLATFORM = process.platform;

const TagDnDContextData = observable({ source: undefined, target: undefined });

window.addEventListener(
  'dragend',
  action((event: DragEvent) => {
    TagDnDContextData.source = undefined;
    if (event.target instanceof HTMLElement) {
      event.target.dataset[DnDAttribute.Source] = 'false';
    }
  }),
  true,
);

window.addEventListener(
  'drop',
  action((event: DragEvent) => {
    TagDnDContextData.target = undefined;
    if (event.target instanceof HTMLElement) {
      event.target.dataset[DnDAttribute.Target] = 'false';
    }
  }),
  true,
);

const App = observer(() => {
  const { uiStore } = useContext(StoreContext);

  // Listen to responses of Web Workers
  useWorkerListener();

  // Show splash screen for some time or when app is not initialized
  const [showSplash, setShowSplash] = useState(true);

  const [outlinerWidth, setOutlinerWidth] = useState(uiStore.outlinerWidth);
  const isOutlinerOpen = uiStore.isOutlinerOpen;
  const width = uiStore.outlinerWidth;

  useEffect(() => {
    if (isOutlinerOpen) {
      setOutlinerWidth(width);
    } else {
      setOutlinerWidth(0);
    }
  }, [isOutlinerOpen, width]);

  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Add listener for global keyboard shortcuts
    window.addEventListener('keydown', uiStore.processGlobalShortCuts);

    return () => window.removeEventListener('keydown', uiStore.processGlobalShortCuts);
  }, [uiStore.processGlobalShortCuts]);

  // Automatically expand outliner when detecting a drag event
  const openOutlinerOnDragEnter = useCallback(() => {
    if (!isOutlinerOpen) {
      uiStore.toggleOutliner();
    }
  }, [uiStore, isOutlinerOpen]);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  return (
    <DropContextProvider onDragEnter={openOutlinerOnDragEnter}>
      <div
        data-os={PLATFORM}
        data-fullscreen={uiStore.isFullScreen}
        id="layout-container"
        className={uiStore.theme}
      >
        {PLATFORM !== 'darwin' && !uiStore.isFullScreen && <WindowTitlebar />}

        <ErrorBoundary>
          <TagDnDContext.Provider value={TagDnDContextData}>
            <WindowSplitter
              id="window-splitter"
              primary={<Outliner />}
              secondary={<Main />}
              axis="vertical"
              value={outlinerWidth}
              onResize={uiStore.resizeOutliner}
            />
          </TagDnDContext.Provider>

          <SettingsWindow />

          <HelpCenter />

          <AdvancedSearchDialog />

          <CustomToaster />
        </ErrorBoundary>
      </div>
    </DropContextProvider>
  );
});

export default App;
