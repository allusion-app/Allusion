import React, { useContext, useEffect, useCallback } from 'react';

import StoreContext from './contexts/StoreContext';
import ErrorBoundary from './components/ErrorBoundary';
import ContentView from './containers/ContentView';
import { Button, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import IconSet from './components/Icons';

const PreviewApp = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  useEffect(uiStore.viewSlide, []);

  const handleLeftButton = useCallback(
    () => uiStore.setFirstIndexInView(Math.max(0, uiStore.firstIndexInView - 1)),
    []);

  const handleRightButton = useCallback(
    () => uiStore.setFirstIndexInView(Math.min(uiStore.firstIndexInView + 1, fileStore.fileList.length - 1)),
    [fileStore.fileList.length]);

  return (
    <div className={`${themeClass}`} style={{ height: '100%' }}>
      <ErrorBoundary>
        <div id="toolbar" style={{height: '2.4rem'}}>
          <section id="preview-toolbar">
            <Button
              icon={IconSet.ARROW_LEFT}
              onClick={handleLeftButton}
              minimal
              disabled={uiStore.firstIndexInView === 0}
            />
            <Button
              icon={IconSet.ARROW_RIGHT}
              onClick={handleRightButton}
              minimal
              disabled={uiStore.firstIndexInView === fileStore.fileList.length - 1}
            />
            <Switch
              label="Overview"
              onClick={() => uiStore.viewMethod = uiStore.viewMethod === 'slide' ? 'grid' : 'slide'}
              checked={uiStore.viewMethod !== 'slide'}
              style={{ margin: 'auto', marginLeft: '1em', display: 'inline' }}
            />
          </section>
        </div>

        <ContentView />
      </ErrorBoundary>
    </div>
  );
});

export default PreviewApp;
