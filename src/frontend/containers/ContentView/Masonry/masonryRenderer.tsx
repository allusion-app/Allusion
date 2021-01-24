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
    // Needed in order to re-render forcefully when the layout updates
    const [layoutTimestamp, setLayoutTimestamp] = useState<Date>();
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
          } catch (e) {
            console.error(e);
          }
        })();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [
      numImages,
      // check 1st and last ID for changes
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fileStore.fileList[0]?.id,
      // eslint-disable-next-line react-hooks/exhaustive-deps
      fileStore.fileList[numImages - 1].id,
    ]);

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
            // setLayoutTimestamp(new Date()); // no need for force rerender: the containerHeight must already have changed
          } catch (e) {
            console.error(e);
          }
        })();
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [containerWidth, thumbnailSize, viewMethod]);

    console.log(fileStore.fileList);

    return !(containerHeight && layoutTimestamp) ? (
      <p>loading...</p>
    ) : (
      <VirtualizedRenderer
        className="masonry"
        key={layoutTimestamp.getTime()}
        containerWidth={containerWidth}
        containerHeight={containerHeight}
        images={fileStore.fileList}
        layout={worker}
        overscan={thumbnailSize * 4}
        select={select}
        showContextMenu={showContextMenu}
      />
    );
  },
);

export default MasonryRenderer;
