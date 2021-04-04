import React, { useCallback, useContext, useEffect, useState } from 'react';
import { comboMatches, getKeyCombo, parseKeyCombo } from '@blueprintjs/core';
import { runInAction, observable, action } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import HelpCenter from './containers/HelpCenter';
import SplashScreen from './containers/SplashScreen';
import { Toaster as CustomToaster } from './components/Toaster';

import AdvancedSearchDialog from './containers/AdvancedSearch';
import ContentView from './containers/ContentView';
import Outliner from './containers/Outliner';
import SettingsWindow from './containers/Settings';
import AppToolbar from './containers/AppToolbar';

import { useWorkerListener } from './ThumbnailGeneration';
import WindowTitlebar from './containers/WindowTitlebar';
import { DropContextProvider } from './contexts/DropContext';
import OutlinerSplitter from './containers/Outliner/OutlinerSplitter';
import TagDnDContext from './contexts/TagDnDContext';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';

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
);

window.addEventListener(
  'drop',
  action((event: DragEvent) => {
    TagDnDContextData.target = undefined;
    if (event.target instanceof HTMLElement) {
      event.target.dataset[DnDAttribute.Target] = 'false';
    }
  }),
);

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
        let isMatch = true;
        // UI
        if (matches(hotkeyMap.toggleOutliner)) {
          uiStore.toggleOutliner();
        } else if (matches(hotkeyMap.toggleInspector)) {
          uiStore.toggleInspector();
        } else if (matches(hotkeyMap.openTagEditor)) {
          // note: this should be a ContentView-specific toggle, but also in toolbar
          // easiest to make it global for now
          e.preventDefault();
          uiStore.openToolbarTagPopover();
          // Windows
        } else if (matches(hotkeyMap.toggleSettings)) {
          uiStore.toggleSettings();
        } else if (matches(hotkeyMap.toggleHelpCenter)) {
          uiStore.toggleHelpCenter();
        } else if (matches(hotkeyMap.openPreviewWindow)) {
          uiStore.openPreviewWindow();
          e.preventDefault(); // prevent scrolling with space when opening the preview window
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
      });
    },
    [uiStore],
  );

  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Add listener for global keyboard shortcuts
    window.addEventListener('keydown', handleGlobalShortcuts);

    return () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleGlobalShortcuts]);

  // Automatically expand outliner when detecting a drag event
  const isOutlinerOpen = uiStore.isOutlinerOpen;
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
            <Outliner />

            <OutlinerSplitter />

            <AppToolbar />

            <ContentView />
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
