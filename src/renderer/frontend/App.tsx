import { Breadcrumbs, IBreadcrumbProps, InputGroup } from '@blueprintjs/core';
import React from "react";
import FileList from './components/FileList';
import Sidebar from './components/Sidebar';

const breadcrumbs: IBreadcrumbProps[] = [
  { icon: 'symbol-square' },
  { icon: "folder-close", text: "Cars" },
  { icon: "folder-close", text: "Yellow" },
  { icon: "document", text: "New" },
];

const App = () => (
  <div className="bp3-dark column">
    <Sidebar />
    <div className="gallery">
      <Breadcrumbs
        items={breadcrumbs}
      />

      <InputGroup type="search" leftIcon="search" placeholder="Search">
      </InputGroup>

      <FileList />
    </div>
  </div>
);

export default App;
