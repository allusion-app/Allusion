import React from 'react';
import fs from 'fs';
import path from 'path';
import { observer } from 'mobx-react-lite';

import RootStore from '../stores/RootStore';
import { withRootstore } from '../contexts/StoreContext';
import FileInfo from './FileInfo';
import FileTag from './FileTag';

const sufixes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const getBytes = (bytes: number) => {
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return !bytes && '0 Bytes' || (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sufixes[i];
};

interface IInspectorProps {
  rootStore: RootStore;
}

const Inspector = ({ rootStore: { uiStore } }: IInspectorProps) => {
  const selectedFiles = uiStore.clientFileSelection;

  let selectionPreview;
  let headerText;
  let headerSubtext;

  if (selectedFiles.length === 0) {
    headerText = 'No image selected';
  } else if (selectedFiles.length === 1) {
    const singleFile = selectedFiles[0];
    const ext = singleFile.path.substr(singleFile.path.lastIndexOf('.') + 1).toUpperCase();
    selectionPreview = (
      <img
        src={singleFile.path}
        style={{ cursor: 'zoom-in' }}
        onClick={() => uiStore.imageViewerFile = singleFile}
      />
    );
    headerText = path.basename(singleFile.path);
    headerSubtext = `${ext} image - ${getBytes(fs.statSync(singleFile.path).size)}`;
  } else {
    // Todo: fs.stat (not sync) is preferred, but it seems to execute instantly... good enough for now
    let size = 0;
    selectedFiles.forEach((f) => size += fs.statSync(f.path).size);

    // Todo: What to show when selecting multiple images?
    selectionPreview = <p>Carousel of selected images here?</p>;
    headerText = selectedFiles.map((f) => path.basename(f.path)).join(', ');
    headerSubtext = getBytes(size);
  }

  if (selectedFiles.length > 0) {
    return (
      <aside
        id="inspector"
        className={`${uiStore.isInspectorOpen ? 'inspectorOpen' : ''}`}
      >
        <section id="filePreview">{selectionPreview}</section>

        <section id="fileOverview">
          <div className="inpectorHeading">{headerText}</div>
          <small>{headerSubtext}</small>
        </section>

        <FileInfo files={selectedFiles} />
        <FileTag files={selectedFiles} />
      </aside>
    );
  } else {
    return (
      <aside
        id="inspector"
        className={`${uiStore.isInspectorOpen ? 'inspectorOpen' : ''}`}
      >
        <section id="filePreview" />
        <section id="fileOverview">
          <div className="inpectorHeading">{headerText}</div>
        </section>
      </aside>
    );
  }
};

export default withRootstore(observer(Inspector));
