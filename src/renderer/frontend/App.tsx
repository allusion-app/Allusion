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
import DropOverlay from './components/DropOverlay';

const SPLASH_SCREEN_TIME = 700;

interface IAppProps extends IRootStoreProp {}

const App = ({ rootStore: { uiStore } }: IAppProps) => {

  // Show splash screen for some time or when app is not initialized
  const [showSplash, setShowSplash] = useState(true);
  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);
  }, []);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
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
          </GlobalHotkeys>
        </ErrorBoundary>
      </div>
    </DropOverlay>
  );
};

export default withRootstore(observer(App));
