import React, { useContext, useEffect } from 'react';

import StoreContext from '../contexts/StoreContext';
import ErrorBoundary from './ErrorBoundary';
import FileList from './FileList';
import { Button, Switch } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import IconSet from './Icons';

const PreviewApp = () => {
  const { uiStore } = useContext(StoreContext);
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  useEffect(uiStore.viewSlide, []);

  return (
    <div className={`${themeClass}`} style={{ height: '100%' }}>
      <ErrorBoundary>
        <div id="toolbar" style={{height: '2.4rem'}}>
          <section id="preview-toolbar">
            <Button
              icon={IconSet.ARROW_LEFT}
              // Todo: Fixme
              onClick={() => console.log('This will work in the selection-improvements branch')}
              minimal
              // disabled
            />
            <Button
              icon={IconSet.ARROW_RIGHT}
              // Todo: Fixme
              onClick={() => console.log('This will work in the selection-improvements branch')}
              minimal
              // disabled
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
