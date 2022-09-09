import React, { useCallback, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import HelpCenter from './containers/HelpCenter';
import { Toaster as CustomToaster } from './components/Toaster';

import AdvancedSearchDialog from './containers/AdvancedSearch';
import Settings from './containers/Settings';

import { useWorkerListener } from './image/ThumbnailGeneration';
import WindowTitlebar from './containers/WindowTitlebar';
import { DropContextProvider } from './contexts/DropContext';
import Main from './containers/Main';
import About from './containers/About';
import { CustomThemeProvider } from './hooks/useCustomTheme';
import { useClipboardImporter } from './hooks/useClipboardImporter';

const PLATFORM = process.platform;

const App = observer(() => {
  const { uiStore } = useStore();

  // Listen to responses of Web Workers
  useWorkerListener();
  useClipboardImporter(uiStore);

  const isOutlinerOpen = uiStore.isOutlinerOpen;

  useEffect(() => {
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

  return (
    <CustomThemeProvider>
      <DropContextProvider onDragEnter={openOutlinerOnDragEnter}>
        <div
          data-os={PLATFORM}
          data-fullscreen={uiStore.isFullScreen}
          id="layout-container"
          className={uiStore.theme}
        >
          {!uiStore.isFullScreen && <WindowTitlebar />}

          <ErrorBoundary>
            <Main />

            <Settings />

            <HelpCenter />

            <About />

            <AdvancedSearchDialog />

            <CustomToaster />
          </ErrorBoundary>
        </div>
      </DropContextProvider>
    </CustomThemeProvider>
  );
});

export default App;
