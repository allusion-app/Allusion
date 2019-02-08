import { Breadcrumbs, IBreadcrumbProps, InputGroup } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import React from "react";
import { DragDropContextProvider } from 'react-dnd';
import HTML5Backend from 'react-dnd-html5-backend';


import FileList from './components/FileList';
import Sidebar from './components/Sidebar';
import { withRootstore } from './contexts/StoreContext';
import RootStore from './stores/RootStore';

interface IAppProps {
  rootStore: RootStore;
}

const App = ({
  rootStore: { uiStore },
}: IAppProps) => {

  // Breadcrumbs placeholder
  const breadcrumbs: IBreadcrumbProps[] = [
    { icon: 'symbol-square' },
    { icon: "folder-close", text: "Cars" },
    { icon: "folder-close", text: "Yellow" },
    { icon: "document", text: "New" },
  ];

  const themeClass = uiStore.theme === 'DARK' ? 'bp3-dark' : 'bp3-light';

  return (
    <div className={`${themeClass} column`}>
      <DragDropContextProvider backend={HTML5Backend}>
        <Sidebar />

        <div className="main">
          <div className="header">
            <Breadcrumbs
              items={breadcrumbs}
            />

            {/* This can be replaced with the custom SearchBar component later */}
            <InputGroup type="search" leftIcon="search" placeholder="Search" />
          </div>

          <br />

          <div className="gallery">
            <FileList />
          </div>
        </div>
      </DragDropContextProvider>
    </div>
  );
};

export default withRootstore(observer(App));
