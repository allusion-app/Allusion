import React, { useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import { CSSTransition } from 'react-transition-group';
import { ClientFile } from '../../../entities/File';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';
import StoreContext from '../../contexts/StoreContext';
import { clamp } from '../../utils';
import { MissingImageFallback } from '../ContentView/GalleryItem';

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
        <section>
          <h2 className="inspector-heading">No image selected</h2>
        </section>
      </Container>
    );
  }

  let selectionPreview: ReactNode;

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
  } else {
    // Stack effects: https://tympanus.net/codrops/2014/03/05/simple-stack-effects/
    selectionPreview = <Carousel items={uiStore.clientFileSelection} />;
  }

  return (
    <Container>
      <div className="inspector-preview">{selectionPreview}</div>
      <section>
        <h2 className="inspector-heading">Information</h2>
        {selectedFiles.size === 1 ? (
          <ImageInfo file={fileStore.get(uiStore.getFirstSelectedFileId())!} />
        ) : (
          `Selected ${uiStore.clientFileSelection.length} files`
        )}
      </section>
      <section>
        <h2 className="inspector-heading">Tags</h2>
        <FileTags files={uiStore.clientFileSelection} />
      </section>
    </Container>
  );
});

export default Inspector;
