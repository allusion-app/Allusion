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
import { AdvancedSearchDialog } from './containers/Outliner/SearchForm';
import { useWorkerListener } from './ThumbnailGeneration';
import { DragLayer } from './containers/Outliner/TagPanel';
import { Toaster, Position } from '@blueprintjs/core';
import WelcomeDialog from './components/WelcomeDialog';

const SPLASH_SCREEN_TIME = 700;

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
  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Prevent scrolling with Space, instead used to open preview window
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space') {
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
      <div id="layoutContainer" className={`${themeClass}`}>
        <ErrorBoundary>
          <GlobalHotkeys>
            <Toolbar />

            <Outliner />

            <ContentView />

            <Inspector />

            <Settings />

            <AdvancedSearchDialog />

            <WelcomeDialog />

            {/* Overlay for showing custom drag previews */}
            <DragLayer />
          </GlobalHotkeys>
        </ErrorBoundary>
      </div>
    </DropOverlay>
  );
});

export default App;
