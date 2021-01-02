import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { ClientFile } from 'src/renderer/entities/File';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { debounce } from 'src/renderer/frontend/utils';
import { MasonryWorkerAdapter } from '.';
import { getThumbnailSize } from '../Gallery';
import { ILayout } from './masonry.worker';
import Renderer from './renderer';

interface IMasonryRendererProps {
  containerWidth: number;
}

const formatItems = (imgs: ClientFile[]) => imgs.map(x => ({ width: x.width, height: x.height }));

const MasonryRenderer = observer(({ containerWidth }: IMasonryRendererProps) => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const [layout, setLayout] = useState<ILayout>();
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
    worker.initialize()
      .then(() => worker.compute(formatItems(fileStore.fileList), containerWidth, thumbnailSize)
        .then(setLayout)
        .catch(console.error)
      ).catch(console.error);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Compute new layout when images change
  useEffect(() => {
    console.log(containerWidth);
    if (containerWidth > 100) { // todo: could debounce if needed. Or only recompute in increments?
      worker.compute(formatItems(fileStore.fileList), containerWidth, thumbnailSize)
        .then(setLayout)
        .catch((e) => window.alert('Could not compute layout: ' + e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore.fileList, fileStore.fileList.length]);

  // Re-compute when container width changes
  useEffect(() => {
    console.log(containerWidth);
    if (containerWidth > 100) { // todo: could debounce if needed. Or only recompute in increments?
      worker.recompute(containerWidth, thumbnailSize)
        .then(setLayout)
        .catch((e) => window.alert('Could not compute layout: ' + e));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [containerWidth, thumbnailSize]);

  return !layout ? <p>loading...</p> : (
    <Renderer
      className="masonry"
      containerWidth={containerWidth}
      containerHeight={layout.containerHeight}
      images={fileStore.fileList}
      layout={layout}
    />
  )
});

export default MasonryRenderer;
