import { observer } from 'mobx-react-lite';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { ViewMethod } from 'src/renderer/frontend/stores/UiStore';
import { getThumbnailSize, ILayoutProps } from '../Gallery';
import { MasonryWorkerAdapter } from './masonryWorkerAdapter';
import Renderer from './renderer';

interface IMasonryRendererProps {
  type: ViewMethod.MasonryVertical | ViewMethod.MasonryHorizontal;
}

const MasonryRenderer = observer(({ uiStore, fileStore, contentRect, select, showContextMenu, lastSelectionIndex }: IMasonryRendererProps & ILayoutProps) => {
  const [containerHeight, setContainerHeight] = useState<number>();
  // Needed in order to re-render forcefully when the layout updates
  const [layoutTimestamp, setLayoutTimestamp] = useState<Date>();
  const [worker] = useState(new MasonryWorkerAdapter());
  const [, thumbnailSize] = useMemo(() => getThumbnailSize(uiStore.thumbnailSize), [
    uiStore.thumbnailSize,
  ]);
  const containerWidth = contentRect.width;

  const viewMethod = uiStore.method;
  const numImages = fileStore.fileList.length;

  // TODO: vertical keyboard navigation with lastSelectionIndex

  // const debouncedRecompute = useCallback((containerWidth: number, thumbnailSize: number) =>
  //   debounce(() =>
  //     worker.recompute(containerWidth, thumbnailSize)
  //       .then(setLayout)
  //       .catch((e) => window.alert('Could not compute layout: ' + e)),
  // ), [worker]);

  // Initialize on mount
  useEffect(() => {
    console.log('Masonry mounted!');
    (async function onMount() {
      try {
        await worker.initialize(numImages);
        const containerHeight = await worker.compute(
          fileStore.fileList,
          containerWidth,
          { thumbSize: thumbnailSize, type: viewMethod === ViewMethod.MasonryVertical ? 'vertical' : 'horizontal' },
        );
        console.log('computed v3', containerWidth, worker.items);
        setContainerHeight(containerHeight);
        setLayoutTimestamp(new Date());
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute new layout when content changes (new fileList, e.g. sorting, searching)
  useEffect(() => {
    if (containerHeight !== undefined && containerWidth > 100) { // todo: could debounce if needed. Or only recompute in increments?
      console.log('Masonry: Items changed, computing new layout!');
      (async function onItemOrderChange() {
        try {
          const containerHeight = await worker.compute(
            fileStore.fileList,
            containerWidth,
            { thumbSize: thumbnailSize, type: viewMethod === ViewMethod.MasonryVertical ? 'vertical' : 'horizontal' },
          );
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
    fileStore.fileList[0]?.id, fileStore.fileList[numImages - 1].id],
  );

  // Re-compute when the environment changes (container width, thumbnail size, view method)
  useEffect(() => {
    if (containerHeight !== undefined && containerWidth > 100) {
      console.log('Masonry: Environment changed! Recomputing layout!');
      (async function onResize() {
        try {
          const containerHeight = await worker.recompute(
            containerWidth,
            { thumbSize: thumbnailSize, type: viewMethod === ViewMethod.MasonryVertical ? 'vertical' : 'horizontal' },
          );
          setContainerHeight(containerHeight);
          // setLayoutTimestamp(new Date()); // no need for force rerender: the containerHeight must already have changed
        } catch (e) {
          console.error(e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, thumbnailSize, viewMethod]);

  return !(containerHeight && layoutTimestamp) ? <p>loading...</p> : (
    <Renderer
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
  )
});

export default MasonryRenderer;
