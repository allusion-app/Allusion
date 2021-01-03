import React, { useCallback, useContext, useEffect, useState } from 'react';
import { comboMatches, getKeyCombo, parseKeyCombo, Position, Toaster } from '@blueprintjs/core';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import HelpCenter from './containers/HelpCenter';
import SplashScreen from './containers/SplashScreen';
import { Toaster as CustomToaster } from './components/Toaster';

import AdvancedSearchDialog from './containers/AdvancedSearch';
import ContentView from './containers/ContentView';
import Inspector from './containers/Inspector';
import Outliner from './containers/Outliner';
import SettingsWindow from './containers/Settings';
import AppToolbar from './containers/AppToolbar';

import { useWorkerListener } from './ThumbnailGeneration';
import WindowsToolbar from './containers/AppToolbar/WindowsToolbar';
import { DropContextProvider } from './contexts/DropContext';

const SPLASH_SCREEN_TIME = 1400;
const PLATFORM = process.platform;

export const AppToaster = Toaster.create({
  position: Position.BOTTOM_RIGHT,
  className: 'toaster',
});

const App = observer(() => {
  const { uiStore } = useContext(StoreContext);

  // Listen to responses of Web Workers
  useWorkerListener();

  // Show splash screen for some time or when app is not initialized
  const [showSplash, setShowSplash] = useState(true);

  const handleGlobalShortcuts = useCallback(
    (e: KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.('input')) return;
      const combo = getKeyCombo(e);
      const matches = (c: string): boolean => {
        return comboMatches(combo, parseKeyCombo(c));
      };
      runInAction(() => {
        const { hotkeyMap } = uiStore;
        // UI
        if (matches(hotkeyMap.toggleOutliner)) {
          uiStore.toggleOutliner();
        } else if (matches(hotkeyMap.toggleInspector)) {
          uiStore.toggleInspector();
          // Windows
        } else if (matches(hotkeyMap.toggleSettings)) {
          uiStore.toggleSettings();
        } else if (matches(hotkeyMap.toggleHelpCenter)) {
          uiStore.toggleHelpCenter();
        } else if (matches(hotkeyMap.openPreviewWindow)) {
          uiStore.openPreviewWindow();
          // Search
        } else if (matches(hotkeyMap.advancedSearch)) {
          uiStore.toggleAdvancedSearch();
          // View
        } else if (matches(hotkeyMap.viewList)) {
          uiStore.setMethodList();
        } else if (matches(hotkeyMap.viewGrid)) {
          uiStore.setMethodGrid();
        } else if (matches(hotkeyMap.viewSlide)) {
          uiStore.toggleSlideMode();
        }
      });
    },
    [uiStore],
  );

  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Prevent scrolling with Space, instead used to open preview window
    window.addEventListener('keydown', handleGlobalShortcuts);

    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleGlobalShortcuts]);

  // const openOutlinerOnDragEnter = useCallback(() => {
  //   if (!uiStore.isOutlinerOpen) {
  //     uiStore.toggleOutliner();
  //   }
  // }, [uiStore]);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    // TODO: Open outliner on dragEnter: onDragEnter={openOutlinerOnDragEnter}. Problem: drag counter is messed up when DOM is updated: always off by one -> isDragging stays true
    <DropContextProvider>
      <div data-os={PLATFORM} id="layout-container" className={themeClass}>
        {PLATFORM !== 'darwin' && <WindowsToolbar />}

        <ErrorBoundary>
          <Outliner />

          <AppToolbar />

          <ContentView />

          <Inspector />

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
