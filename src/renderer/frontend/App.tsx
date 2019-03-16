import { Breadcrumbs, IBreadcrumbProps, InputGroup, Tag, Intent } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React from 'react';

import FileList from './components/FileList';
import Sidebar from './components/Sidebar';
import { withRootstore, IRootStoreProp } from './contexts/StoreContext';
import Icons from './components/Icons';

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
    <div className={`${themeClass} column`}>
      <Sidebar />

      <div className="main">
        <div className="header">
          <Breadcrumbs items={breadcrumbs} />

          {/* This can be replaced with the custom SearchBar component later */}
          <InputGroup type="search" leftIcon="search" placeholder="Search" />

          <Tag icon="plus" large intent={Intent.NONE}>Built-in icon</Tag>
          <Tag icon="chevron-down" large intent={Intent.PRIMARY}>Built-in icon</Tag>
          <Tag icon="chevron-right" large intent={Intent.SUCCESS}>Built-in icon</Tag>
          <Tag icon="tick" large intent={Intent.WARNING}>Built-in icon</Tag>
          <Tag icon="cross" large intent={Intent.DANGER}>Built-in icon</Tag>

          <br />
          {Object.values(Icons)
            .map((icon, i) => (
              <Tag
                icon={icon}
                large
                intent={Object.values(Intent)[i % Object.values(Intent).length]}
                key={`tag-${i}`}
              >
                Custom icon
              </Tag>
            ))}
        </div>

        <br />

        <div className="gallery">
          <FileList />
        </div>
      </div>
    </div>
  );
};

export default withRootstore(observer(App));
