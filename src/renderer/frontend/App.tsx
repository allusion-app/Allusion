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
import Settings from './components/Settings';
import DropOverlay from './components/DropOverlay';
import { AdvancedSearchDialog } from './containers/Outliner/SearchPanel';
import { useWorkerListener } from './ThumbnailGeneration';
import { Toaster, Position } from '@blueprintjs/core';
import WelcomeDialog from './components/WelcomeDialog';

const SPLASH_SCREEN_TIME = 1400;

export const AppToaster = Toaster.create({
  position: Position.TOP,
  className: 'toaster',
});

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

  const themeClass = `app-theme ${uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light'}`;

  const sidebarClass = uiStore.isToolbarVertical ? 'vertical-toolbar' : '';

  return (
    // Overlay that shows up when dragging files/images over the application
    <DropOverlay>
      <div className={sidebarClass}>
        <div id="layoutContainer" className={themeClass}>
          <ErrorBoundary>
            <GlobalHotkeys>
              <Toolbar />

              <Outliner />

              <ContentView />

              <Inspector />

              <Settings />

              <AdvancedSearchDialog />

              <WelcomeDialog />
            </GlobalHotkeys>
          </ErrorBoundary>
        </div>
      </div>
    </DropOverlay>
  );
});

export default App;
