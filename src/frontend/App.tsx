import React, { useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from './contexts/StoreContext';

import ErrorBoundary from './containers/ErrorBoundary';
import HelpCenter from './containers/HelpCenter';
import SplashScreen from './containers/SplashScreen';
import { Toaster as CustomToaster } from './components/Toaster';

import AdvancedSearchDialog from './containers/AdvancedSearch';
import Settings from './containers/Settings';

import { useWorkerListener } from './ThumbnailGeneration';
import WindowTitlebar from './containers/WindowTitlebar';
import { DropContextProvider } from './contexts/DropContext';
import Main from './containers/Main';
import About from './containers/About';

const SPLASH_SCREEN_TIME = 1400;
const PLATFORM = process.platform;

const App = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);

  // Listen to responses of Web Workers
  useWorkerListener();

  // Show splash screen for some time or when app is not initialized
  const [showSplash, setShowSplash] = useState(true);

  const handleGlobalShortcuts = useRef((e: KeyboardEvent) => {
    uiStore.processGlobalShortCuts(e, fileStore);
  });

  useEffect(() => {
    setTimeout(() => setShowSplash(false), SPLASH_SCREEN_TIME);

    // Add listener for global keyboard shortcuts
    const processGlobalShortCuts = handleGlobalShortcuts.current;
    window.addEventListener('keydown', processGlobalShortCuts);

    return () => window.removeEventListener('keydown', processGlobalShortCuts);
  }, []);

  if (!uiStore.isInitialized || showSplash) {
    return <SplashScreen />;
  }

  return (
    <DropContextProvider onDragEnter={uiStore.openOutliner}>
      <div
        data-os={PLATFORM}
        data-fullscreen={uiStore.preferences.isFullScreen}
        id="layout-container"
        className={uiStore.preferences.theme}
      >
        {PLATFORM !== 'darwin' && !uiStore.preferences.isFullScreen && <WindowTitlebar />}

        <ErrorBoundary>
          <Main />

          <Settings />

          <HelpCenter />

          <About />

          <AdvancedSearchDialog />

          <CustomToaster />
        </ErrorBoundary>
      </div>
    </DropContextProvider>
  );
});

export default App;
