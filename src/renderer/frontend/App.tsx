import { Button } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React from 'react';

import FileList from './components/FileList';
import Outliner from './components/Outliner';
import { IRootStoreProp, withRootstore } from './contexts/StoreContext';
import Inspector from './components/Inspector';
import Toolbar from './components/Toolbar';

interface IAppProps extends IRootStoreProp {}

const App = ({ rootStore: { uiStore } }: IAppProps) => {
  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <div id={'layoutContainer'} className={`${themeClass}`}>
      <Toolbar />

      <Outliner />

      <main>
        <div className="header">
        </div>

        <FileList />
      </main>

      <Inspector />
    </div>
  );
};

export default withRootstore(observer(App));
