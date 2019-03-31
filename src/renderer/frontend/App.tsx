import { Breadcrumbs, IBreadcrumbProps, InputGroup, Button } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React from 'react';

import FileList from './components/FileList';
import Outliner from './components/Outliner';
import { IRootStoreProp, withRootstore } from './contexts/StoreContext';
import Inspector from './components/Inspector';

interface IAppProps extends IRootStoreProp {}

const App = ({ rootStore: { uiStore } }: IAppProps) => {
  // Breadcrumbs placeholder
  const breadcrumbs: IBreadcrumbProps[] = [
    { icon: 'symbol-square' },
    { icon: 'folder-close', text: 'Cars' },
    { icon: 'folder-close', text: 'Yellow' },
    { icon: 'document', text: 'New' },
  ];

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <div className={`${themeClass} grid`}>
      <Outliner />

      <main>
        <div className="header">
          <Breadcrumbs items={breadcrumbs} />

          {/* This can be replaced with the custom SearchBar component later */}
          <InputGroup type="search" leftIcon="search" placeholder="Search" />

          <Button icon="info-sign" onClick={() => { uiStore.isInspectorOpen = !uiStore.isInspectorOpen; }} />
        </div>

        <br />

        <div className="gallery">
          <FileList />
        </div>
      </main>

      <Inspector />
    </div>
  );
};

export default withRootstore(observer(App));
