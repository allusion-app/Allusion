import { action, autorun, flow } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import { useStore } from 'src/frontend/contexts/StoreContext';
import FocusManager from 'src/frontend/FocusManager';
import { ViewMethod } from 'src/frontend/stores/UiStore';
import { CancellablePromise } from 'common/promise';
import { sleep, throttle } from 'common/timeout';
import { MasonryType } from 'wasm/packages/masonry';
import { GalleryProps, getThumbnailSize } from '../utils';
import { MasonryWorkerAdapter, MASONRY_PADDING } from './MasonryWorkerAdapter';
import VirtualizedRenderer from './VirtualizedRenderer';
import { useComputed } from 'src/frontend/hooks/mobx';

function toMasonryType(viewMethod: ViewMethod): MasonryType {
  switch (viewMethod) {
    case ViewMethod.MasonryVertical:
      return MasonryType.Vertical;

    case ViewMethod.MasonryHorizontal:
      return MasonryType.Horizontal;

    case ViewMethod.Grid:
    default:
      return MasonryType.Grid;
  }
}

const SCROLL_BAR_WIDTH = 8;

const worker = new MasonryWorkerAdapter();

const MasonryRenderer = observer(({ contentRect, select, lastSelectionIndex }: GalleryProps) => {
  const rootStore = useStore();
  const [containerHeight, setContainerHeight] = useState<number>(0);
  // The timestamp from when the layout was last updated
  const [layoutTimestamp, setLayoutTimestamp] = useState<Date>(new Date());
  const thumbnailSize = useComputed(() => getThumbnailSize(rootStore.uiStore.thumbnailSize));
  const containerWidth = contentRect.width - SCROLL_BAR_WIDTH - MASONRY_PADDING;

  // Vertical keyboard navigation with lastSelectionIndex
  // note: horizontal keyboard navigation is handled elsewhere: LayoutSwitcher
  useEffect(() => {
    const onKeyDown = action((e: KeyboardEvent) => {
      const { fileStore, uiStore } = rootStore;
      let index = lastSelectionIndex.current;
      if (index === undefined) {
        return;
      }
      // Find the image that's below/above the center of the current image
      const curTransform = worker.getTransform(index);
      const curTransformCenter = curTransform[3] + curTransform[0] / 2;
      const maxLookAhead = 100;
      const numFiles = fileStore.fileList.length;

      if (e.key === 'ArrowUp') {
        for (let i = index - 1; i > Math.max(0, i - maxLookAhead); i--) {
          const [tWidth, , , tLeft] = worker.getTransform(i);
          if (tLeft < curTransformCenter && tLeft + tWidth > curTransformCenter) {
            index = i;
            break;
          }
        }
      } else if (e.key === 'ArrowDown' && index < numFiles - 1) {
        for (let i = index + 1; i < Math.min(i + maxLookAhead, numFiles); i++) {
          const [tWidth, , , tLeft] = worker.getTransform(i);
          if (tLeft < curTransformCenter && tLeft + tWidth > curTransformCenter) {
            index = i;
            break;
          }
        }
      } else {
        return;
      }
      e.preventDefault();
      select(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);

      // Don't change focus when TagEditor overlay is open: is closes onBlur
      if (!uiStore.isToolbarTagPopoverOpen) {
        FocusManager.focusGallery();
      }
    });

    const throttledKeyDown = throttle(onKeyDown, 50);
    window.addEventListener('keydown', throttledKeyDown);
    return () => window.removeEventListener('keydown', throttledKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const { fileStore } = rootStore;

    // Initialize on mount
    if (!worker.isInitialized) {
      const initTask = flow(function* initialize() {
        try {
          yield* worker.initialize(fileStore.fileList.length);
          setLayoutTimestamp(new Date());
        } catch (e) {
          console.error(e);
        }
      })();

      return () => {
        initTask.catch(() => {});
        initTask.cancel();
      };
    } else {
      // Compute new layout when content changes (new fileList, e.g. sorting, searching)
      return autorun(() => {
        console.debug('Masonry: Items changed!');
        worker.updateContent(fileStore.fileList);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worker.isInitialized]);

  // Compute new layout when the environment changes (e.g. container width, thumbnail size, view method).
  useEffect(() => {
    if (!worker.isInitialized) {
      return;
    }

    let layoutTask: CancellablePromise<void> | undefined = undefined;

    const dispose = autorun(() => {
      rootStore.fileStore.index.observe();
      const masonryType = toMasonryType(rootStore.uiStore.method);
      const size = thumbnailSize.get();

      layoutTask?.cancel();
      layoutTask = flow(function* compute() {
        // Debounce is not needed due to performance, but images are sometimes repeatedly swapping columns every
        // recomputation, which looks awful.
        yield sleep(150);

        console.debug('Masonry: Environment changed. Recomputing layout!');

        try {
          const containerHeight = yield* worker.compute(containerWidth, masonryType, size);
          setContainerHeight(containerHeight);
          setLayoutTimestamp(new Date());
        } catch (e) {
          console.error(e);
        }
      })();
      layoutTask.catch(() => console.debug('Cancelled computing layout.'));
    });

    return () => {
      dispose();
      layoutTask?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, worker.isInitialized]);

  return !worker.isInitialized ? (
    <></>
  ) : (
    <VirtualizedRenderer
      className="masonry"
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      images={rootStore.fileStore.fileList}
      layout={worker}
      overscan={thumbnailSize.get() * 3}
      lastSelectionIndex={lastSelectionIndex}
      layoutUpdateDate={layoutTimestamp}
      padding={MASONRY_PADDING}
    />
  );
});

MasonryRenderer.displayName = 'MasonryRenderer';

export default MasonryRenderer;
