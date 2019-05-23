import React, { useContext, useEffect } from 'react';

import StoreContext from '../contexts/StoreContext';
import ErrorBoundary from './ErrorBoundary';
import FileList from './FileList';

const PreviewApp = () => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  useEffect(uiStore.viewSlide, []);

  return (
    <div className={`${themeClass}`} style={{ height: '100%' }}>
      <ErrorBoundary>
        <FileList />
      </ErrorBoundary>
    </div>
  );
}

export default PreviewApp;
