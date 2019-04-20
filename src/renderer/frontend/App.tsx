import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import FileList from './components/FileList';
import Outliner from './components/Outliner';
import { IRootStoreProp, withRootstore } from './contexts/StoreContext';
import Inspector from './components/Inspector';
import Toolbar from './components/Toolbar';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';

const SPLASH_SCREEN_TIME = 500;

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
    <div id="layoutContainer" className={`${themeClass}`}>
      <ErrorBoundary>
        <Toolbar />

        <Outliner />

        <main>
          <FileList />
        </main>

        <Inspector />
      </ErrorBoundary>
    </div>
  );
};

export default withRootstore(observer(App));
