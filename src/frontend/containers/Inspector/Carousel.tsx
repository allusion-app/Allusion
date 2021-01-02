import React, { useState, useCallback, useMemo } from 'react';
import { observer } from 'mobx-react-lite';

import { clamp } from '../../utils';
import UiStore from 'src/frontend/stores/UiStore';

export const Carousel = observer(({ uiStore }: { uiStore: UiStore }) => {
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

export default Carousel;
