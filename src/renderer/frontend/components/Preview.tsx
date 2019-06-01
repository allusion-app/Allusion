import React, { useContext, useEffect } from 'react';

import StoreContext from '../contexts/StoreContext';
import ErrorBoundary from './ErrorBoundary';
import FileList from './FileList';
import { ButtonGroup, Button, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';

const PreviewApp = () => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  useEffect(uiStore.viewSlide, []);

  return (
    <div className={`${themeClass}`} style={{ height: '100%' }}>
      <ErrorBoundary>
        <div id="toolbar" style={{ marginBottom: '-1em', height: 'auto' }}>
          <section id="outliner-toolbar">
            <Button
              icon="arrow-left"
              // Todo: Fixme
              onClick={() => console.log('This will work in the selection-improvements branch')}
              minimal
              disabled
            />
            <Button
              icon="arrow-right"
              // Todo: Fixme
              onClick={() => console.log('This will work in the selection-improvements branch')}
              minimal
              disabled
            />
            <Switch
              label="Overview"
              onClick={() => uiStore.viewMethod = uiStore.viewMethod === 'slide' ? 'grid' : 'slide'}
              checked={uiStore.viewMethod !== 'slide'}
              style={{ margin: 'auto', marginLeft: '1em', display: 'inline' }}
            />
          </section>
        </div>

        <FileList />
      </ErrorBoundary>
    </div>
  );
};

export default observer(PreviewApp);
