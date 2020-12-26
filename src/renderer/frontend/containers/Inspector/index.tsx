import React, { useContext, useState, useCallback, useMemo, ReactNode } from 'react';
import { observer } from 'mobx-react-lite';
import FileTags from '../../components/FileTag';
import ImageInfo from '../../components/ImageInfo';
import StoreContext from '../../contexts/StoreContext';
import { clamp } from '../../utils';
import { MissingImageFallback } from '../ContentView/GalleryItem';
import { Slide } from '../../components/Transition';

const Carousel = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const items = uiStore.fileSelection;
  // NOTE: maxItems is coupled to the CSS! Max is 10 atm (see inspector.scss)
  const maxItems = 7;
  const [scrollIndex, setScrollIndex] = useState(0);

  // Add some padding items so that you can scroll the last item to the front
  const paddedItems = useMemo(() => {
    const padding = new Array(maxItems - 1);
    setScrollIndex(items.size - 1);
    return padding.concat(Array.from(items));
  }, [items]);

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
            aria-label={`${scrollIndex + index + 1} of ${items.size}`}
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
});

const Inspector = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const selectedFiles = uiStore.fileSelection;

  if (selectedFiles.size === 0) {
    return (
      <Slide element="aside" id="inspector" open={uiStore.isInspectorOpen} unmountOnExit>
        <section>
          <header>
            <h2>No image selected</h2>
          </header>
        </section>
      </Slide>
    );
  }

  let selectionPreview: ReactNode;
  let information: ReactNode;

  if (selectedFiles.size === 1) {
    const first = uiStore.firstSelectedFile;
    if (first === undefined) {
      selectionPreview = <MissingImageFallback />;
      information = 'The selected file cannot be found. Please check if the given file exists.';
    } else {
      selectionPreview = first.isBroken ? (
        <MissingImageFallback />
      ) : (
          <img
            src={first.absolutePath}
            style={{ cursor: uiStore.isSlideMode ? undefined : 'zoom-in' }}
            onClick={uiStore.enableSlideMode}
          />
        );
      information = <ImageInfo file={first} />;
    }
  } else {
    // Stack effects: https://tympanus.net/codrops/2014/03/05/simple-stack-effects/
    selectionPreview = <Carousel />;
    information = `Selected ${uiStore.fileSelection.size} files`;
  }

  return (
    <Slide element="aside" id="inspector" open={uiStore.isInspectorOpen} unmountOnExit>
      <div className="inspector-preview">{selectionPreview}</div>
      <section>
        <header>
          <h2>Information</h2>
        </header>
        {information}
      </section>
      <section>
        <header>
          <h2>Tags</h2>
        </header>
        <FileTags />
      </section>
    </Slide>
  );
});

export default Inspector;
