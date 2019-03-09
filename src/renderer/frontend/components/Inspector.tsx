import React from 'react';
import fs from 'fs';
import path from 'path';
import { observer } from 'mobx-react-lite';

import RootStore from '../stores/RootStore';
import { withRootstore } from '../contexts/StoreContext';
import FileInfo from './FileInfo';

const sufixes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const getBytes = (bytes) => {
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return !bytes && '0 Bytes' || (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sufixes[i];
};

interface IInspectorProps {
  rootStore: RootStore;
}

const Inspector = ({ rootStore: { uiStore, fileStore } }: IInspectorProps) => {

  const selectedFiles = uiStore.fileSelection.map((id) => fileStore.fileList.find((f) => f.id === id));

  let selectionPreview;
  let headerText;
  let headerSubtext;
  if (selectedFiles.length === 0) {
    selectionPreview = '';
    headerText = 'No image selected';
    headerSubtext = ' ';
  } else if (selectedFiles.length === 1) {
    const singleFile = selectedFiles[0];
    const ext = singleFile.path.substr(singleFile.path.lastIndexOf('.') + 1).toUpperCase();
    selectionPreview = <img src={singleFile.path} />;
    headerText = path.basename(singleFile.path);
    headerSubtext = `${ext} image - ${getBytes(fs.statSync(singleFile.path).size)}`;
  } else {
    // Todo: fs.stat (not sync) is preferred, but it seems to execute instantly... good enough for now
    let size = 0;
    selectedFiles.forEach((f) => size += fs.statSync(f.path).size);

    selectionPreview = <p>Carousel of selected images here?</p>;
    headerText = selectedFiles.map((f) => path.basename(f.path)).join(', ');
    headerSubtext = getBytes(size);
  }

  return (
    <div className={`inspector ${uiStore.isInspectorOpen ? 'inspectorOpen' : ''}`}>
      <div className="inspectorSection">
        {selectionPreview}
      </div>

      <div className="inspectorSection center bp3-text-overflow-ellipsis">
        <b>{headerText}</b>
        <br />
        <small>{headerSubtext}</small>
      </div>

      <div className="inspectorSection">
        <FileInfo files={selectedFiles} />
      </div>
    </div>
  );
};

export default withRootstore(observer(Inspector));
