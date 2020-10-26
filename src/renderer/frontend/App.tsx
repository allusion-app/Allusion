import React, { useState, useEffect, useContext } from 'react';
import { observer } from 'mobx-react-lite';

import ContentView from './containers/ContentView';
import Outliner from './containers/Outliner';
import StoreContext from './contexts/StoreContext';
import Inspector from './containers/Inspector';
import Toolbar from './containers/Toolbar';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import GlobalHotkeys from './components/Hotkeys';
import SettingsWindow from './containers/Settings';
import HelpCenter from './components/HelpCenter';
import DropOverlay from './components/DropOverlay';
import AdvancedSearchDialog from './containers/AdvancedSearch';
import { useWorkerListener } from './ThumbnailGeneration';
import { Toaster, Position } from '@blueprintjs/core';
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
  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Prevent scrolling with Space, instead used to open preview window
    window.addEventListener('keydown', (e) => {
      if (e.key === ' ' && !(e.target instanceof HTMLInputElement)) {
        e.preventDefault();
      }
    });
  }, []);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    // Overlay that shows up when dragging files/images over the application
    <DropOverlay>
      <div data-os={PLATFORM} id="layout-container" className={themeClass} onClick={handleClick}>
        <ErrorBoundary>
          <GlobalHotkeys>
            <OutlinerToggle />

            <Outliner />

            <Toolbar />

            <ContentView />

            <Inspector />

            <SettingsWindow />

            <HelpCenter />

            <AdvancedSearchDialog />

            <WelcomeDialog />
          </GlobalHotkeys>
        </ErrorBoundary>
      </div>
    </DropOverlay>
  );
});

export default App;
