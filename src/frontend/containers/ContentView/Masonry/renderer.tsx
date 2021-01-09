import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { ClientFile } from 'src/entities/File';
import StoreContext from 'src/frontend/contexts/StoreContext';
import { debouncedThrottle } from 'src/frontend/utils';
import { ExternalAppMenuItems, FileViewerMenuItems, ILayoutProps, MissingFileMenuItems } from '../Gallery';
import { GridCell } from '../GalleryItem';
import { ITransform } from './masonry.worker';

export interface Layouter {
  getItemLayout: (index: number) => ITransform;
}

interface IRendererProps {
  containerHeight: number;
  containerWidth: number;
  images: ClientFile[];
  layout: Layouter;
  className?: string;
  /** Render images outside of the viewport within this margin (pixels) */
  overscan?: number;
  // TODO: initialScrollOffset
}

/**
 * Performs a binary search that finds the index of the first (or last) image at a specified height.
 * Assumes images are ordered linearly in top-offset. This is not always the case (vertical masonry),
 * but should be close enough, in combination with rendering a little more than what's in the viewport.
 * @param height The query height
 * @param length The amount of images
 * @param layout The layout of the images
 * @param overshoot Whether to overshoot: return the first or last image at the specified height
 */
export function binarySearch(height: number, length: number, layout: Layouter, overshoot: boolean): number {
  if (height <= 0) return 0; // easy base case

  // TODO: Could exploit the assumption that the images are ordered linearly in top-offset,
  // by making the initial guess at height/maxHeight
  // Alternatively, instead of searching at runtime, preprocess top-offsets of images
  // in an O(1) look-up table when the layout is (re)computed

  let iteration = 1;
  let nextLookup = Math.round(length / 2);
  while (true) {
    iteration++;
    let stepSize = (length / Math.pow(2, iteration));
    if (stepSize < 1) return nextLookup;
    stepSize = Math.round(stepSize);
    const t = layout.getItemLayout(nextLookup);
    if (t.top > height) {
      if (t.top + t.height > height) { // looked up too far, go back:
        nextLookup -= stepSize;
      } else { // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      }
    } else {
      if (t.top + t.height > height) { // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      } else {
        nextLookup += stepSize;
      }
    }
  }
}

/**
 * This is the virtualized renderer: it only renders the items in the viewport.
 * It renders a scrollable viewport and a content element within it.
 */
const Renderer = observer((
  { containerHeight, containerWidth, images, layout, className, overscan, select, showContextMenu }:
    IRendererProps & Pick<ILayoutProps, 'select' | 'showContextMenu'>,
) => {
  const { uiStore, fileStore } = useContext(StoreContext);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [startRenderIndex, setStartRenderIndex] = useState(0);
  const [endRenderIndex, setEndRenderIndex] = useState(0);


  const numImages = images.length;

  const determineRenderRegion = useCallback((numImages: number, overdraw: number) => {
    const viewport = (wrapperRef.current);
    const yOffset = viewport?.scrollTop || 0;
    const viewportHeight = viewport?.clientHeight || 0;

    const start = binarySearch(yOffset - overdraw, numImages, layout, false);
    const end = binarySearch(yOffset + viewportHeight + overdraw, numImages, layout, true);

    // console.log('determineRenderRegion', { yOffset, viewportHeight, start, end, overdraw, numImages });

    setStartRenderIndex(start);
    setEndRenderIndex(Math.min(end, start + 256)); // hard limit of 256 images at once, for safety reasons
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const throttledRedetermine = useRef(
    debouncedThrottle(
      (numImages: number, overdraw: number) =>
        determineRenderRegion(numImages, overdraw),
      100,
    ));

  useEffect(() => {
    throttledRedetermine.current(numImages, overscan || 0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [numImages, containerWidth, containerHeight]);

  const handleScroll = () => throttledRedetermine.current(numImages, overscan || 0);

  // console.log({ startRenderIndex, endRenderIndex, numImages });

  return (
    // One div as the scrollable viewport
    <div className={className} onScroll={handleScroll} ref={wrapperRef}>
      {/* One div for the content */}
      <div style={{ width: containerWidth, height: containerHeight }}>
        {images.slice(startRenderIndex, endRenderIndex).map((im, index) => (
          // <img
          //   key={im.id}
          //   src={im.thumbnailPath}
          //   alt={im.id}
          //   style={layout.getItemLayout(startRenderIndex + index)}
          // />

          // TODO: completely re-using GridCell probably won't work. Should make a copy
          // and slightly adjust it
          <GridCell
            key={im.id}
            file={fileStore.fileList[startRenderIndex + index]}
            mounted
            colIndex={0}
            uiStore={uiStore}
            fileStore={fileStore}
            style={layout.getItemLayout(startRenderIndex + index)}
            onClick={(e) => runInAction(() => select(fileStore.fileList[startRenderIndex + index], e.ctrlKey || e.metaKey, e.shiftKey))}
            onDoubleClick={() => { uiStore.selectFile(im, true); uiStore.toggleSlideMode(); }}
            onContextMenu={(e) => showContextMenu(
              e.clientX,
              e.clientY,
              [
                im.isBroken
                  ? (<MissingFileMenuItems uiStore={uiStore} fileStore={fileStore} />)
                  : (<FileViewerMenuItems file={im} uiStore={uiStore} />),
                im.isBroken ? <></> : <ExternalAppMenuItems path={im.absolutePath} />,
              ],
            )}
          />
        ))}
      </div>
    </div >
  )
});

export default Renderer;
