import { observer } from 'mobx-react-lite';
import React, { useEffect, useMemo, useState } from 'react';
import { ViewMethod } from 'src/frontend/stores/UiStore';
import { getThumbnailSize, ILayoutProps } from '../Gallery';
import { MasonryWorkerAdapter } from './MasonryWorkerAdapter';
import VirtualizedRenderer from './VirtualizedRenderer';

interface IMasonryRendererProps {
  type: ViewMethod.MasonryVertical | ViewMethod.MasonryHorizontal;
}

const SCROLL_BAR_WIDTH = 8;

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
    // Identical to layoutTimestamp, except it is not set when the environment (e.g. container width) changes
    const [forceRerenderObj, setForceRerenderObj] = useState<Date>(new Date());
    const [worker] = useState(new MasonryWorkerAdapter());
    const [, thumbnailSize] = useMemo(() => getThumbnailSize(uiStore.thumbnailSize), [
      uiStore.thumbnailSize,
    ]);
    const containerWidth = contentRect.width - SCROLL_BAR_WIDTH;

    const viewMethod = uiStore.method;
    const numImages = fileStore.fileList.length;

    // TODO: vertical keyboard navigation with lastSelectionIndex

    // Initialize on mount
    useEffect(() => {
      (async function onMount() {
        try {
          await worker.initialize(numImages);
          const containerHeight = await worker.compute(fileStore.fileList, containerWidth, {
            thumbSize: thumbnailSize,
            type: viewMethod === ViewMethod.MasonryVertical ? 'vertical' : 'horizontal',
          });
          setContainerHeight(containerHeight);
          setLayoutTimestamp(new Date());
          setForceRerenderObj(new Date());
        } catch (e) {
          console.error(e);
        }
      })();
      return () => void worker.free()?.catch(console.error); // free memory when unmounting
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Compute new layout when content changes (new fileList, e.g. sorting, searching)
    useEffect(() => {
      if (containerHeight !== undefined && containerWidth > 100) {
        // todo: could debounce if needed. Or only recompute in increments?
        console.log('Masonry: Items changed, computing new layout!');
        (async function onItemOrderChange() {
          try {
            console.time('recompute-layout');
            const containerHeight = await worker.compute(fileStore.fileList, containerWidth, {
              thumbSize: thumbnailSize,
              type: viewMethod === ViewMethod.MasonryVertical ? 'vertical' : 'horizontal',
            });
            console.timeEnd('recompute-layout');
            setContainerHeight(containerHeight);
            setLayoutTimestamp(new Date());
            setForceRerenderObj(new Date());
          } catch (e) {
            console.error(e);
          }
        })();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numImages, fileStore.fileListLastModified]);

    // Re-compute when the environment changes (container width, thumbnail size, view method)
    useEffect(() => {
      if (containerHeight !== undefined && containerWidth > 100) {
        console.log('Masonry: Environment changed! Recomputing layout!');
        (async function onResize() {
          try {
            console.time('recompute-layout');
            const containerHeight = await worker.recompute(containerWidth, {
              thumbSize: thumbnailSize,
              type: viewMethod === ViewMethod.MasonryVertical ? 'vertical' : 'horizontal',
            });
            console.timeEnd('recompute-layout');
            setContainerHeight(containerHeight);
            setLayoutTimestamp(new Date());
            // no need for force rerender: causes flickering. Rerender already happening due to container height update anyways
          } catch (e) {
            console.error(e);
          }
        })();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerWidth, thumbnailSize, viewMethod]);

    return !(containerHeight && layoutTimestamp) ? (
      <p>loading...</p>
    ) : (
      <VirtualizedRenderer
        className="masonry"
        // Force a complete re-render when the layout has been changed
        key={forceRerenderObj.getTime()}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        images={fileStore.fileList}
        layout={worker}
        overscan={thumbnailSize * 4}
        select={select}
        showContextMenu={showContextMenu}
        lastSelectionIndex={lastSelectionIndex}
        layoutUpdateDate={layoutTimestamp}
      />
    );
  },
);

export default MasonryRenderer;
