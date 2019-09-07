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
import ImageViewer from './components/ImageViewer';
import { DragLayer } from './containers/Outliner/TagPanel';

const SPLASH_SCREEN_TIME = 700;

const App = observer(() => {
  const { uiStore } = useContext(StoreContext);

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
    <div id="layoutContainer" className={`${themeClass}`}>
      <ErrorBoundary>
        <GlobalHotkeys>
          <Toolbar />

          <Outliner />

          <ContentView />

          {uiStore.imageViewerFile ? (
            <ImageViewer file={uiStore.imageViewerFile} onClose={() => uiStore.imageViewerFile = null} />
          ) : <></>}

          <Inspector />

          <Settings />

          <DragLayer />
        </GlobalHotkeys>
      </ErrorBoundary>
    </div>
  );
});

export default App;
