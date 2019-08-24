import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import FileList from './components/FileList';
import Outliner from './components/Outliner';
import { IRootStoreProp, withRootstore } from './contexts/StoreContext';
import Inspector from './components/Inspector';
import Toolbar from './components/Toolbar';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import GlobalHotkeys from './components/Hotkeys';
import Settings from './components/Settings';
import DragLayer from './components/DragAndDrop';
import DropOverlay from './components/DropOverlay';

const SPLASH_SCREEN_TIME = 700;

interface IAppProps extends IRootStoreProp {}

const App = ({ rootStore }: IAppProps) => {
  const { uiStore } = rootStore;

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

            <main>
              <FileList />
            </main>

            <Inspector />

            <Settings />

            {/* Overlay for showing custom drag previews */}
            <DragLayer />
          </GlobalHotkeys>
        </ErrorBoundary>
      </div>
    </DropOverlay>
  );
};

export default withRootstore(observer(App));
