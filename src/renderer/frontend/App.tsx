import React, { useState, useEffect, useContext, useCallback } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

import ContentView from './containers/ContentView';
import Outliner from './containers/Outliner';
import StoreContext from './contexts/StoreContext';
import Inspector from './containers/Inspector';
import Toolbar from './containers/Toolbar';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import SettingsWindow from './containers/Settings';
import HelpCenter from './components/HelpCenter';
import DropOverlay from './components/DropOverlay';
import AdvancedSearchDialog from './containers/AdvancedSearch';
import { useWorkerListener } from './ThumbnailGeneration';
import { Toaster, Position, getKeyCombo, comboMatches, parseKeyCombo } from '@blueprintjs/core';
import WelcomeDialog from './containers/WelcomeDialog';
import { ToolbarToggleButton } from 'components/menu';
import { IconSet } from 'components';

const SPLASH_SCREEN_TIME = 1400;
const PLATFORM = process.platform;

export const AppToaster = Toaster.create({
  position: Position.BOTTOM_RIGHT,
  className: 'toaster',
});

const OutlinerToggle = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <ToolbarToggleButton
      id="outliner-toggle"
      controls="outliner"
      pressed={uiStore.isOutlinerOpen}
      icon={uiStore.isOutlinerOpen ? IconSet.ARROW_LEFT : IconSet.ARROW_RIGHT}
      onClick={uiStore.toggleOutliner}
      text="Toggle Outliner"
      showLabel="never"
      tabIndex={0}
    />
  );
});

const handleClick = (e: React.MouseEvent) => {
  if (!(e.target instanceof HTMLElement && e.target.closest('dialog[open][data-contextmenu]'))) {
    const dialogs = e.currentTarget.querySelectorAll('dialog[open][data-contextmenu]');
    dialogs.forEach((d) => (d as HTMLDialogElement).close());
  }
};

const App = observer(() => {
  const { uiStore } = useContext(StoreContext);

  // Listen to responses of Web Workers
  useWorkerListener();

  // Show splash screen for some time or when app is not initialized
  const [showSplash, setShowSplash] = useState(true);

  const handleGlobalShortcuts = useCallback(
    (e: KeyboardEvent) => {
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

    () => window.removeEventListener('keydown', handleGlobalShortcuts);
  }, [handleGlobalShortcuts]);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    // Overlay that shows up when dragging files/images over the application
    <DropOverlay>
      <div data-os={PLATFORM} id="layout-container" className={themeClass} onClick={handleClick}>
        <ErrorBoundary>
          <OutlinerToggle />

          <Outliner />

          <Toolbar />

          <ContentView />

          <Inspector />

          <SettingsWindow />

          <HelpCenter />

          <AdvancedSearchDialog />

          <WelcomeDialog />
        </ErrorBoundary>
      </div>
    </DropOverlay>
  );
});

export default App;
