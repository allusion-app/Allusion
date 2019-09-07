import React, { useContext } from 'react';
import fs from 'fs';
import path from 'path';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import ImageInfo from '../../components/ImageInfo';
import FileTag from '../../components/FileTag';
import { ClientFile } from '../../../entities/File';

const sufixes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const getBytes = (bytes: number) => {
  if (bytes <= 0) {
    return '0 Bytes';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sufixes[i];
};

const MultiFileInfo = observer(({ files }: {files: ClientFile[]}) => {
  return (
    <section>
      <p>Selected {files.length} files</p>
    </section>
  );
});

const Inspector = observer(() => {
  const { uiStore } = useContext(StoreContext);
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
        onClick={() => (uiStore.imageViewerFile = singleFile)}
      />
    );
    headerText = path.basename(singleFile.path);
    headerSubtext = `${ext} image - ${getBytes(fs.statSync(singleFile.path).size)}`;
  } else {
    // Todo: fs.stat (not sync) is preferred, but it seems to execute instantly... good enough for now
    const size = selectedFiles.reduce((sum, f) => sum + fs.statSync(f.path).size, 0);

    // Todo: What to show when selecting multiple images?
    selectionPreview = <p>Carousel of selected images here?</p>;
    headerText = selectedFiles.map((f) => path.basename(f.path)).join(', ');
    headerSubtext = getBytes(size);
  }

  if (selectedFiles.length > 0) {
    return (
      <aside id="inspector" className={`${uiStore.isInspectorOpen ? 'inspectorOpen' : ''}`}>
        <section id="filePreview">{selectionPreview}</section>

        <section id="fileOverview">
          <div className="inpectorHeading">{headerText}</div>
          <small>{headerSubtext}</small>
        </section>

        {selectedFiles.length === 1 ? (
          <ImageInfo file={selectedFiles[0]} />
        ) : (
          <MultiFileInfo files={selectedFiles} />
        )}
        <FileTag files={selectedFiles} />
      </aside>
    );
  } else {
    return (
      <aside id="inspector" className={`${uiStore.isInspectorOpen ? 'inspectorOpen' : ''}`}>
        <section id="filePreview" />
        <section id="fileOverview">
          <div className="inpectorHeading">{headerText}</div>
        </section>
      </aside>
    );
  }
});

export default Inspector;
