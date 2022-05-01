import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { useStore } from 'src/frontend/contexts/StoreContext';
import FocusManager from 'src/frontend/FocusManager';
import { ViewMethod } from 'src/frontend/stores/UiStore';
import { debounce, throttle } from 'common/timeout';
import { MasonryType } from 'wasm/packages/masonry';
import { GalleryProps, getThumbnailSize } from '../utils';
import { MasonryWorkerAdapter } from './MasonryWorkerAdapter';
import VirtualizedRenderer from './VirtualizedRenderer';

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
const MASONRY_PADDING = 8; // Note: keep in sync with .masonry class padding

const worker = new MasonryWorkerAdapter();

const MasonryRenderer = observer(({ contentRect, select, lastSelectionIndex }: GalleryProps) => {
  const { fileStore, uiStore } = useStore();
  const [containerHeight, setContainerHeight] = useState<number>();
  // The timestamp from when the layout was last updated
  const [layoutTimestamp, setLayoutTimestamp] = useState<Date>(new Date());
  // Needed in order to re-render forcefully when the layout updates
  // Doesn't seem to be necessary anymore - might cause overlapping thumbnails, but could not reproduce
  const [forceRerenderObj, setForceRerenderObj] = useState<Date>(new Date());
  const thumbnailSize = getThumbnailSize(uiStore.thumbnailSize);
  const containerWidth = contentRect.width - SCROLL_BAR_WIDTH - MASONRY_PADDING;

  const viewMethod = uiStore.method as SupportedViewMethod;
  const numImages = fileStore.fileList.length;

  // Vertical keyboard navigation with lastSelectionIndex
  // note: horizontal keyboard navigation is handled elsewhere: LayoutSwitcher
  useEffect(() => {
    const onKeyDown = action((e: KeyboardEvent) => {
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
    (async function onMount() {
      try {
        await worker.initialize(numImages);
        const start = performance.now();
        const containerHeight = await worker.compute(
          fileStore.fileList,
          numImages,
          containerWidth,
          {
            thumbSize: thumbnailSize,
            type: ViewMethodLayoutDict[viewMethod],
          },
        );
        console.log(performance.now() - start);
        setContainerHeight(containerHeight);
        setLayoutTimestamp(new Date());
        setForceRerenderObj(new Date());
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute new layout when content changes (new fileList, e.g. sorting, searching)
  useEffect(() => {
    if (containerHeight !== undefined && containerWidth > 100) {
      // todo: could debounce if needed. Or only recompute in increments?
      console.debug('Masonry: Items changed. Computing new layout!');
      (async function onItemOrderChange() {
        try {
          const containerHeight = await worker.compute(
            fileStore.fileList,
            numImages,
            containerWidth,
            {
              thumbSize: thumbnailSize,
              type: ViewMethodLayoutDict[viewMethod],
            },
          );
          setContainerHeight(containerHeight);
          setLayoutTimestamp(new Date());
          // setForceRerenderObj(new Date()); // doesn't seem necessary anymore, which is nice, because it caused flickering when refetching
        } catch (e) {
          console.error(e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numImages, fileStore.fileListLastModified]);

  const handleResize = useRef(
    (() => {
      async function onResize(
        containerWidth: number,
        thumbnailSize: number,
        viewMethod: SupportedViewMethod,
      ) {
        console.debug('Masonry: Environment changed. Recomputing layout!');
        try {
          const start = performance.now();
          const containerHeight = await worker.recompute(containerWidth, {
            thumbSize: thumbnailSize,
            type: ViewMethodLayoutDict[viewMethod],
          });
          console.log(performance.now() - start);
          setContainerHeight(containerHeight);
          setLayoutTimestamp(new Date());
          // no need for force rerender: causes flickering. Rerender already happening due to container height update anyways
        } catch (e) {
          console.error(e);
        }
      }

      // Debounce is not needed due to performance, but images are
      // sometimes repeatedly swapping columns every recomputation, which looks awful
      return debounce(onResize, 150);
    })(),
  );

  // Re-compute when the environment changes (container width, thumbnail size, view method)
  useEffect(() => {
    if (containerHeight !== undefined && containerWidth > 100) {
      handleResize.current(containerWidth, thumbnailSize, viewMethod);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, handleResize, thumbnailSize, viewMethod]);

  return !containerHeight ? (
    <></>
  ) : (
    <VirtualizedRenderer
      className="masonry"
      // Force a complete re-render when the layout has been changed
      key={forceRerenderObj.getTime()}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      images={fileStore.fileList}
      layout={worker}
      overscan={thumbnailSize * 3}
      lastSelectionIndex={lastSelectionIndex}
      layoutUpdateDate={layoutTimestamp}
      padding={MASONRY_PADDING}
    />
  );
});

MasonryRenderer.displayName = 'MasonryRenderer';

export default MasonryRenderer;
