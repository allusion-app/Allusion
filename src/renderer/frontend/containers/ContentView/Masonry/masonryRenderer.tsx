import { observer } from 'mobx-react-lite';
import React, { useContext, useEffect, useMemo, useState } from 'react';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { ViewMethod } from 'src/renderer/frontend/stores/UiStore';
import { getThumbnailSize } from '../Gallery';
import { MasonryWorkerAdapter } from './masonryWorkerAdapter';
import Renderer from './renderer';

interface IMasonryRendererProps {
  containerWidth: number;
  type: ViewMethod.MasonryVertical | ViewMethod.MasonryHorizontal;
}

const MasonryRenderer = observer(({ containerWidth }: IMasonryRendererProps) => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const [containerHeight, setContainerHeight] = useState<number>();
  // Needed in order to re-render forcefully when the layout updates
  const [layoutTimestamp, setLayoutTimestamp] = useState<Date>(new Date());
  const [worker] = useState(new MasonryWorkerAdapter());
  const [, thumbnailSize] = useMemo(() => getThumbnailSize(uiStore.thumbnailSize), [
    uiStore.thumbnailSize,
  ]);

  // const debouncedRecompute = useCallback((containerWidth: number, thumbnailSize: number) =>
  //   debounce(() =>
  //     worker.recompute(containerWidth, thumbnailSize)
  //       .then(setLayout)
  //       .catch((e) => window.alert('Could not compute layout: ' + e)),
  // ), [worker]);

  // Initialize on mount
  useEffect(() => {
    (async function onMount() {
      try {
        await worker.initialize(fileStore.fileList.length);
        const containerHeight = await worker.compute(
          fileStore.fileList,
          containerWidth,
          { thumbSize: thumbnailSize, type: uiStore.isMasonryVertical ? 'vertical' : 'horizontal' },
        );
        setContainerHeight(containerHeight);
        setLayoutTimestamp(new Date());
      } catch (e) {
        console.error(e);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute new layout when images change
  useEffect(() => {
    if (containerHeight !== undefined && containerWidth > 100) { // todo: could debounce if needed. Or only recompute in increments?
      console.log('Items changed!');
      (async function onItemOrderChange() {
        try {
          const containerHeight = await worker.compute(
            fileStore.fileList,
            containerWidth,
            { thumbSize: thumbnailSize, type: uiStore.isMasonryVertical ? 'vertical' : 'horizontal' },
          );
          setContainerHeight(containerHeight);
          setLayoutTimestamp(new Date());
        } catch (e) {
          console.error(e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore.fileList[0]?.id, fileStore.fileList[fileStore.fileList.length - 1].id]); // check 1st and last ID for changes

  // Re-compute when container width changes
  useEffect(() => {
    if (containerHeight !== undefined && containerWidth > 100) {
      console.log('Container width changed!');
      (async function onResize() {
        try {
          const containerHeight = await worker.recompute(
            containerWidth,
            { thumbSize: thumbnailSize, type: uiStore.isMasonryVertical ? 'vertical' : 'horizontal' },
          );
          setContainerHeight(containerHeight);
          // setLayoutTimestamp(new Date()); // no need for force rerender: the containerHeight must already have changed
        } catch (e) {
          console.error(e);
        }
      })();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, thumbnailSize, uiStore.method]);

  return !containerHeight ? <p>loading...</p> : (
    <Renderer
      className="masonry"
      key={layoutTimestamp.getTime()}
      containerWidth={containerWidth}
      containerHeight={containerHeight}
      images={fileStore.fileList}
      layout={worker}
    />
  )
});

export default MasonryRenderer;
