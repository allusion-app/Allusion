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

type SupportedViewMethod =
  | ViewMethod.MasonryVertical
  | ViewMethod.MasonryHorizontal
  | ViewMethod.Grid;

const ViewMethodLayoutDict: Record<SupportedViewMethod, MasonryType> = {
  [ViewMethod.MasonryVertical]: MasonryType.Vertical,
  [ViewMethod.MasonryHorizontal]: MasonryType.Horizontal,
  [ViewMethod.Grid]: MasonryType.Grid,
};

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

  // Initialize on mount
  useEffect(() => {
    const initTask = flow(function* initialize() {
      const { fileStore, uiStore } = rootStore;

      try {
        yield* worker.initialize(fileStore.fileList.length);
        const containerHeight = yield* worker.compute(
          fileStore.fileList,
          containerWidth,
          ViewMethodLayoutDict[uiStore.method as SupportedViewMethod],
          thumbnailSize.get(),
        );
        setContainerHeight(containerHeight);
      } catch (e) {
        console.error(e);
      }
    })();

    return () => {
      initTask.catch(() => {});
      initTask.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute new layout when content changes (new fileList, e.g. sorting, searching)
  useEffect(() => {
    let layoutTask: CancellablePromise<void> | undefined = undefined;

    const dispose = autorun(() => {
      rootStore.fileStore.index.observe();

      if (!worker.isInitialized) {
        return;
      }

      layoutTask?.cancel();
      layoutTask = flow(function* compute() {
        console.debug('Masonry: Items changed. Computing new layout!');

        const { fileStore, uiStore } = rootStore;
        try {
          const containerHeight = yield* worker.compute(
            fileStore.fileList,
            containerWidth,
            ViewMethodLayoutDict[uiStore.method as SupportedViewMethod],
            thumbnailSize.get(),
          );
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
      if (worker.isInitialized && layoutTask !== undefined) {
        layoutTask.cancel();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth]);

  // Re-compute when the environment changes (container width, thumbnail size, view method)
  useEffect(() => {
    let layoutTask: CancellablePromise<void> | undefined = undefined;

    const dispose = autorun(() => {
      const viewMethod = rootStore.uiStore.method as SupportedViewMethod;
      const size = thumbnailSize.get();

      if (!worker.isInitialized) {
        return;
      }

      layoutTask?.cancel();
      layoutTask = flow(function* recompute() {
        // Debounce is not needed due to performance, but images are sometimes repeatedly swapping columns every
        // recomputation, which looks awful.
        yield sleep(100);

        console.debug('Masonry: Environment changed. Recomputing layout!');

        try {
          const containerHeight = yield* worker.recompute(
            containerWidth,
            ViewMethodLayoutDict[viewMethod],
            size,
          );
          setContainerHeight(containerHeight);
          setLayoutTimestamp(new Date());
        } catch (e) {
          console.error(e);
        }
      })();
      layoutTask.catch(() => console.debug('Cancelled re-computing layout.'));
    });

    return () => {
      dispose();
      layoutTask?.cancel();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth]);

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
