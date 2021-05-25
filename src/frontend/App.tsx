import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { action } from 'mobx';

import { useStore } from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import HelpCenter from './containers/HelpCenter';
import SplashScreen from './containers/SplashScreen';
import { Toaster as CustomToaster } from './components/Toaster';

import AdvancedSearchDialog from './containers/AdvancedSearch';
import Settings from './containers/Settings';

import { useWorkerListener } from './ThumbnailGeneration';
import WindowTitlebar from './containers/WindowTitlebar';
import { DropContextProvider } from './contexts/DropContext';
import Main from './containers/Main';
import About from './containers/About';
import { RendererMessenger } from 'src/Messaging';
import { comboMatches, getKeyCombo, parseKeyCombo } from './hotkeyParser';

const SPLASH_SCREEN_TIME = 1400;
const PLATFORM = process.platform;

const App = observer(() => {
  const { uiStore, fileStore } = useStore();

  // Listen to responses of Web Workers
  useWorkerListener();

  // Show splash screen for some time or when app is not initialized
  const [showSplash, setShowSplash] = useState(true);

  const handleGlobalShortcuts = useRef(
    action((e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.('input')) {
        return;
      }
      const combo = getKeyCombo(e);
      const matches = (c: string): boolean => {
        return comboMatches(combo, parseKeyCombo(c));
      };
      const { hotkeyMap } = uiStore.preferences;
      let isMatch = true;
      // UI
      if (matches(hotkeyMap.toggleOutliner)) {
        uiStore.toggleOutliner();
      } else if (matches(hotkeyMap.toggleInspector)) {
        uiStore.toggleInspector();
      } else if (matches(hotkeyMap.openTagEditor)) {
        // Windows
      } else if (matches(hotkeyMap.toggleSettings)) {
        uiStore.toggleSettings();
      } else if (matches(hotkeyMap.toggleHelpCenter)) {
        uiStore.toggleHelpCenter();
      } else if (matches(hotkeyMap.openPreviewWindow)) {
        RendererMessenger.openPreviewWindow(
          Array.from(fileStore.selection, (f) => f.id),
          uiStore.preferences.thumbnailDirectory,
        );
        // Search
      } else if (matches(hotkeyMap.search)) {
        (document.querySelector('.searchbar input') as HTMLElement)?.focus();
      } else if (matches(hotkeyMap.advancedSearch)) {
        uiStore.toggleAdvancedSearch();
        // View
      } else if (matches(hotkeyMap.viewList)) {
        uiStore.setMethodList();
      } else if (matches(hotkeyMap.viewGrid)) {
        uiStore.setMethodGrid();
      } else if (matches(hotkeyMap.viewMasonryVertical)) {
        uiStore.setMethodMasonryVertical();
      } else if (matches(hotkeyMap.viewMasonryHorizontal)) {
        uiStore.setMethodMasonryHorizontal();
      } else if (matches(hotkeyMap.viewSlide)) {
        uiStore.toggleSlideMode();
      } else {
        isMatch = false;
      }

      if (isMatch) {
        e.preventDefault();
      }
    }),
  );

  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Add listener for global keyboard shortcuts
    const processGlobalShortCuts = handleGlobalShortcuts.current;
    window.addEventListener('keydown', processGlobalShortCuts);

    return () => window.removeEventListener('keydown', processGlobalShortCuts);
  }, []);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  return (
    <DropContextProvider onDragEnter={uiStore.openOutliner}>
      <div
        data-os={PLATFORM}
        data-fullscreen={uiStore.preferences.isFullScreen}
        id="layout-container"
        className={uiStore.preferences.theme}
      >
        {PLATFORM !== 'darwin' && !uiStore.preferences.isFullScreen && <WindowTitlebar />}

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
  );
});

export default App;
