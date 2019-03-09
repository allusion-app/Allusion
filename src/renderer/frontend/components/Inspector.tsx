import React from 'react';

import RootStore from '../stores/RootStore';
import { withRootstore } from '../contexts/StoreContext';
import FileInfo from './FileInfo';
import { observer } from 'mobx-react-lite';

interface IInspectorProps {
  rootStore: RootStore;
}

const Inspector = ({ rootStore: { uiStore, fileStore }}) => {

  return (
    <div className="inspector">
      <div className="inspectorSection">
        <img src="https://placekitten.com/300/300" />
      </div>

      <div className="inspectorSection center">
        <b>Image.png</b>
        <br />
        <small>PNG image - 84kB</small>
      </div>

      <div className="inspectorSection">
        <FileInfo files={uiStore.fileSelection.map((id) => fileStore.fileList.find((f) => f.id === id))} />
      </div>
    </div>
  );
};

export default withRootstore(observer(Inspector));
