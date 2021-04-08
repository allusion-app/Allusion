import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef, useState } from 'react';
import { ViewMethod } from 'src/frontend/stores/UiStore';
import { debounce } from 'src/frontend/utils';
import { getThumbnailSize, ILayoutProps } from '../LayoutSwitcher';
import { MasonryWorkerAdapter } from './MasonryWorkerAdapter';
import VirtualizedRenderer from './VirtualizedRenderer';

type SupportedViewMethod =
  | ViewMethod.MasonryVertical
  | ViewMethod.MasonryHorizontal
  | ViewMethod.Grid;

interface IMasonryRendererProps {
  type: SupportedViewMethod;
}

const ViewMethodLayoutDict: Record<SupportedViewMethod, 'vertical' | 'horizontal' | 'grid'> = {
  [ViewMethod.MasonryVertical]: 'vertical',
  [ViewMethod.MasonryHorizontal]: 'horizontal',
  [ViewMethod.Grid]: 'grid',
};

const SCROLL_BAR_WIDTH = 8;

const worker = new MasonryWorkerAdapter();

const MasonryRenderer = observer(
  ({
    uiStore,
    fileStore,
    contentRect,
    select,
    showContextMenu,
    lastSelectionIndex,
  }: IMasonryRendererProps & ILayoutProps) => {
    const [containerHeight, setContainerHeight] = useState<number>();
    // The timestamp from when the layout was last updated
    const [layoutTimestamp, setLayoutTimestamp] = useState<Date>(new Date());
    // Needed in order to re-render forcefully when the layout updates
    // Doesn't seem to be necessary anymore - might cause overlapping thumbnails, but could not reproduce
    const [forceRerenderObj, setForceRerenderObj] = useState<Date>(new Date());
    const thumbnailSize = getThumbnailSize(uiStore.thumbnailSize);
    const containerWidth = contentRect.width - SCROLL_BAR_WIDTH;

    const viewMethod = uiStore.method as SupportedViewMethod;
    const numImages = fileStore.fileList.length;

    // TODO: vertical keyboard navigation with lastSelectionIndex

    // Initialize on mount
    useEffect(() => {
      (async function onMount() {
        try {
          if (!worker.isInitialized) {
            await worker.initialize(numImages);
          }
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
        console.debug('Masonry: Items changed, computing new layout!');
        (async function onItemOrderChange() {
          try {
            console.time('recompute-layout');
            const containerHeight = await worker.compute(
              fileStore.fileList,
              numImages,
              containerWidth,
              {
                thumbSize: thumbnailSize,
                type: ViewMethodLayoutDict[viewMethod],
              },
            );
            console.timeEnd('recompute-layout');
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
          console.debug('Masonry: Environment changed! Recomputing layout!');
          try {
            console.time('recompute-layout');
            const containerHeight = await worker.recompute(containerWidth, {
              thumbSize: thumbnailSize,
              type: ViewMethodLayoutDict[viewMethod],
            });
            console.timeEnd('recompute-layout');
            setContainerHeight(containerHeight);
            setLayoutTimestamp(new Date());
            // no need for force rerender: causes flickering. Rerender already happening due to container height update anyways
          } catch (e) {
            console.error(e);
          }
        }

        // Debounce is not needed due to performance, but images are
        // sometimes repeatedly swapping columns every recomputation, which looks awful
        return debounce(onResize, 50);
      })(),
    );

    // Re-compute when the environment changes (container width, thumbnail size, view method)
    useEffect(() => {
      if (containerHeight !== undefined && containerWidth > 100) {
        handleResize.current(containerWidth, thumbnailSize, viewMethod);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerWidth, handleResize, thumbnailSize, viewMethod]);

    return !(containerHeight && layoutTimestamp) ? (
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
        select={select}
        showContextMenu={showContextMenu}
        lastSelectionIndex={lastSelectionIndex}
        layoutUpdateDate={layoutTimestamp}
      />
    );
  },
);

MasonryRenderer.displayName = 'MasonryRenderer';

export default MasonryRenderer;
