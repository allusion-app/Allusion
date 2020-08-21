import React, { useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import fs from 'fs';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';
import ImageInfo from '../../components/ImageInfo';
import FileTags from '../../components/FileTag';
import { ClientFile } from '../../../entities/File';
import { clamp } from '@blueprintjs/core/lib/esm/common/utils';
import { CSSTransition } from 'react-transition-group';
import { H5, H6 } from '@blueprintjs/core';
import { MissingImageFallback } from '../ContentView/GalleryItem';

const sufixes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
const getBytesHumanReadable = (bytes: number) => {
  if (bytes <= 0) {
    return '0 Bytes';
  }
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + sufixes[i];
};

const MultiFileInfo = observer(({ files }: { files: ClientFile[] }) => {
  return <section>Selected {files.length} files</section>;
});

const Carousel = ({ items }: { items: ClientFile[] }) => {
  // NOTE: maxItems is coupled to the CSS! Max is 10 atm (see inspector.scss)
  const maxItems = 7;
  const [scrollIndex, setScrollIndex] = useState(0);

  // Add some padding items so that you can scroll the last item to the front
  const paddedItems = useMemo(() => {
    const padding = Array.from(Array(maxItems - 1));
    setScrollIndex(items.length - 1);
    return [...padding, ...items];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items.length]);

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const delta = e.deltaY > 0 ? -1 : 1;
      setScrollIndex((v) => clamp(v + delta, 0, paddedItems.length - 1));
    },
    [paddedItems.length],
  );

  return (
    <div
      role="region"
      className="carousel"
      aria-roledescription="carousel"
      aria-label="Gallery Selection"
      aria-live="polite"
      onWheel={handleWheel}
    >
      {/* Show a stack of the first N images (or fewer) */}
      {paddedItems.slice(scrollIndex, scrollIndex + maxItems).map((file, index) =>
        !file ? null : (
          <div
            key={file.id}
            // TODO: Could add in and out transition, but you'd also need to know the scroll direction for that
            className={`carousel-slide child-${index}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${scrollIndex + index + 1} of ${items.length}`}
          >
            {/* TODO: Thumbnail path is not always resolved atm, working on that in another branch */}
            <img
              src={file.thumbnailPath}
              onClick={() => setScrollIndex(scrollIndex - maxItems + 1 + index)}
            />
          </div>
        ),
      )}
    </div>
  );
};

interface IContainer {
  children: ReactNode;
}

const Container = observer(({ children }: IContainer) => {
  const { uiStore } = useContext(StoreContext);
  return (
    <CSSTransition
      in={uiStore.isInspectorOpen}
      classNames="sliding-sidebar"
      // Note: timeout needs to equal the transition time in CSS
      timeout={200}
      unmountOnExit
    >
      <aside id="inspector">{children}</aside>
    </CSSTransition>
  );
});

const Inspector = observer(() => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const selectedFiles = uiStore.fileSelection;

  if (selectedFiles.size === 0) {
    return (
      <Container>
        <H6>
          <i>No image selected</i>
        </H6>
      </Container>
    );
  }

  let selectionPreview: ReactNode;
  let title: string;
  let subTitle: string | undefined;

  if (selectedFiles.size === 1) {
    const singleFile = fileStore.get(uiStore.getFirstSelectedFileId())!;
    selectionPreview = singleFile.isBroken ? (
      <MissingImageFallback />
    ) : (
      <img
        src={singleFile.absolutePath}
        style={{ cursor: uiStore.isSlideMode ? undefined : 'zoom-in' }}
        onClick={uiStore.enableSlideMode}
      />
    );
    title = singleFile.filename;
    try {
      const size = getBytesHumanReadable(fs.statSync(singleFile.absolutePath).size);
      subTitle = `${singleFile.extension.toUpperCase()} image - ${size}`;
    } catch (err) {
      console.warn(err);
    }
  } else {
    const selectedClientFiles = uiStore.clientFileSelection;
    // Stack effects: https://tympanus.net/codrops/2014/03/05/simple-stack-effects/
    selectionPreview = <Carousel items={selectedClientFiles} />;
    title = `${selectedClientFiles[0].filename} and ${selectedFiles.size - 1} more`;
    try {
      // Todo: fs.stat (not sync) is preferred, but it seems to execute instantly... good enough for now
      const size = selectedClientFiles.reduce(
        (sum, f) => sum + fs.statSync(f.absolutePath).size,
        0,
      );
      subTitle = getBytesHumanReadable(size);
    } catch (error) {
      console.warn(error);
    }
  }

  return (
    <Container>
      <figure className="inspector-figure">
        {selectionPreview}
        <figcaption>
          <H5>{title}</H5>
          {subTitle && <small>{subTitle}</small>}
        </figcaption>
      </figure>
      {selectedFiles.size === 1 ? (
        <ImageInfo file={fileStore.get(uiStore.getFirstSelectedFileId())!} />
      ) : (
        <MultiFileInfo files={uiStore.clientFileSelection} />
      )}
      <FileTags files={uiStore.clientFileSelection} />
    </Container>
  );
});

export default Inspector;
