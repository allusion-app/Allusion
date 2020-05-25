import React, { useContext, useState, useCallback } from 'react';
import fs from 'fs';
import path from 'path';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import ImageInfo from '../../components/ImageInfo';
import FileTags from '../../components/FileTag';
import { ClientFile } from '../../../entities/File';
import { TransitionGroup, CSSTransition } from 'react-transition-group';

const sufixes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const getBytes = (bytes: number) => {
  if (bytes <= 0) {
    return '0 Bytes';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sufixes[i];
};

const MultiFileInfo = observer(({ files }: { files: ClientFile[] }) => {
  return (
    <section>
      <p>Selected {files.length} files</p>
    </section>
  );
});

const Carousel = ({ items, maxItems = 5 }: { items: ClientFile[], maxItems?: number }) => {
  const [scrollIndex, setScrollIndex] = useState(0);
  // const [directionClass, setDirectionClass] = useState<'up' | 'down'>('up');

  const handleWheel = useCallback((e: React.WheelEvent) => {
    const delta = e.deltaY > 0 ? -1 : 1;
    setScrollIndex((v) => (v + delta + items.length) % items.length);
    console.log( delta);
  }, [items.length]);

  return (
    <TransitionGroup id="carousel" onWheel={handleWheel}>
      {/* Show a stack of the first N images (with some css magic - the N limit is also hard coded in there) */}
      {[
        ...items.slice(scrollIndex, scrollIndex + maxItems),
        ...items.slice(0, Math.max(0, scrollIndex - items.length + maxItems)),
      ].map((file) => (
        <CSSTransition timeout={200}  classNames="item" key={file.id}>
          <div key={file.id}>
            <img src={file.thumbnailPath} />
          </div>
        </CSSTransition>
      ))}
    </TransitionGroup>
  )
}

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
        style={{ cursor: uiStore.view.isSlideMode ? undefined : 'zoom-in' }}
        onClick={uiStore.view.enableSlideMode}
      />
    );
    headerText = path.basename(singleFile.path);
    headerSubtext = `${ext} image - ${getBytes(fs.statSync(singleFile.path).size)}`;
  } else {
    // Todo: fs.stat (not sync) is preferred, but it seems to execute instantly... good enough for now
    const size = selectedFiles.reduce((sum, f) => sum + fs.statSync(f.path).size, 0);

    // Stack effects: https://tympanus.net/codrops/2014/03/05/simple-stack-effects/
    // TODO: Would be nice to hover over an image and that all images before that get opacity 0.1
    // Or their transform is adjusted so they're more spread apart or something
    // TODO: Maybe a dropshadow?
    selectionPreview = (
      // <figure id="stack" className="stack-queue">
      //   {/* Show a stack of the first 5 images (with some css magic - the 5 limit is also hard coded in there) */}
      //   {selectedFiles.slice(0, 5).map((file) => (
      //     <img src={file.thumbnailPath} key={file.id} />
      //   ))}
      // </figure>
      <Carousel items={selectedFiles} />
    );
    headerText = `${selectedFiles[0].name} and ${selectedFiles.length - 1} more`;
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
        <FileTags files={selectedFiles} />
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
