import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useLayoutEffect, useRef, useState } from 'react';
import { thumbnailMaxSize } from 'src/config';
import { ClientFile } from 'src/entities/File';
import StoreContext from 'src/frontend/contexts/StoreContext';
import { debouncedThrottle } from 'src/frontend/utils';
import { ILayoutProps } from '../Gallery';
import { MasonryCell } from '../GalleryItem';
import { ExternalAppMenuItems, FileViewerMenuItems, MissingFileMenuItems } from '../menu-items';
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
  layoutUpdateDate: Date;
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
export function binarySearch(
  height: number,
  length: number,
  layout: Layouter,
  overshoot: boolean,
): number {
  if (height <= 0) return 0; // easy base case

  // TODO: Could exploit the assumption that the images are ordered linearly in top-offset,
  // by making the initial guess at height/maxHeight
  // Alternatively, instead of searching at runtime, preprocess top-offsets of images
  // in an O(1) look-up table when the layout is (re)computed

  let iteration = 1;
  let nextLookup = Math.round(length / 2);
  while (true) {
    iteration++;
    let stepSize = length / Math.pow(2, iteration);
    if (stepSize < 1) return nextLookup;
    stepSize = Math.round(stepSize);
    const t = layout.getItemLayout(nextLookup);
    if (t.top > height) {
      if (t.top + t.height > height) {
        // looked up too far, go back:
        nextLookup -= stepSize;
      } else {
        // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      }
    } else {
      if (t.top + t.height > height) {
        // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      } else {
        nextLookup += stepSize;
      }
    }
  }
}

// const styleFromTransform = (t: ITransform) => ({
//   width: t.width,
//   height: t.height,
//   // Google Photos is using this, they probably researched it. Could be just for old browsers or something
//   transform: `translate3d(${t.left}px, ${t.top}px, 0px)`,
// });

/**
 * This is the virtualized renderer: it only renders the items in the viewport.
 * It renders a scrollable viewport and a content element within it.
 */
const VirtualizedRenderer = observer(
  ({
    containerHeight,
    containerWidth,
    images,
    layout,
    className,
    overscan,
    select,
    showContextMenu,
    lastSelectionIndex,
    layoutUpdateDate,
  }: IRendererProps & Pick<ILayoutProps, 'select' | 'showContextMenu' | 'lastSelectionIndex'>) => {
    const { uiStore, fileStore } = useContext(StoreContext);
    const wrapperRef = useRef<HTMLDivElement>(null);
    const scrollAnchor = useRef<HTMLDivElement>(null);
    const [startRenderIndex, setStartRenderIndex] = useState(0);
    const [endRenderIndex, setEndRenderIndex] = useState(0);

    const numImages = images.length;

    const determineRenderRegion = useCallback((numImages: number, overdraw: number) => {
      const viewport = wrapperRef.current;
      const yOffset = viewport?.scrollTop || 0;
      const viewportHeight = viewport?.clientHeight || 0;

      const start = binarySearch(yOffset - overdraw, numImages, layout, false);
      const end = binarySearch(yOffset + viewportHeight + overdraw, numImages, layout, true);

      setStartRenderIndex(start);
      setEndRenderIndex(Math.min(end, start + 256)); // hard limit of 256 images at once, for safety reasons
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const throttledRedetermine = useRef(
      debouncedThrottle(
        (numImages: number, overdraw: number) => determineRenderRegion(numImages, overdraw),
        100,
      ),
    );

    useLayoutEffect(() => {
      throttledRedetermine.current(numImages, overscan || 0);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numImages, containerWidth, containerHeight]);

    const handleScroll = () => throttledRedetermine.current(numImages, overscan || 0);

    const handleClick = useCallback(
      (e: React.MouseEvent) => {
        const target = (e.target as HTMLElement).closest('[data-masonrycell]');
        if (target === null) {
          return;
        }
        e.stopPropagation();
        const index = parseInt(target.getAttribute('data-fileindex')!);
        runInAction(() => select(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey));
      },
      [fileStore.fileList, select],
    );

    const handleDoubleClick = useCallback(
      (e: React.MouseEvent) => {
        const target = (e.target as HTMLElement).closest('[data-masonrycell]');
        if (target === null) {
          return;
        }
        e.stopPropagation();
        const index = parseInt(target.getAttribute('data-fileindex')!);
        runInAction(() => {
          uiStore.selectFile(fileStore.fileList[index], true);
          uiStore.toggleSlideMode();
        });
      },
      [fileStore.fileList, uiStore],
    );

    const handleContextMenu = useCallback(
      (e: React.MouseEvent) => {
        const target = (e.target as HTMLElement).closest('[data-masonrycell]');
        if (target === null) {
          return;
        }
        e.stopPropagation();
        const index = parseInt(target.getAttribute('data-fileindex')!);
        runInAction(() => {
          const file = fileStore.fileList[index];
          showContextMenu(e.clientX, e.clientY, [
            file.isBroken ? (
              <MissingFileMenuItems uiStore={uiStore} fileStore={fileStore} />
            ) : (
              <FileViewerMenuItems file={file} uiStore={uiStore} />
            ),
            file.isBroken ? <></> : <ExternalAppMenuItems path={file.absolutePath} />,
          ]);
        });
      },
      [fileStore, showContextMenu, uiStore],
    );

    // Scroll to the first item in the view any time it is changed
    const lastSelIndex = lastSelectionIndex.current;
    useLayoutEffect(() => {
      if (lastSelIndex !== undefined && scrollAnchor?.current !== null) {
        // Scroll to invisible element, positioned at selected element,
        // just for scroll automatisation with scrollIntoView
        const s = layout.getItemLayout(lastSelIndex);
        scrollAnchor.current.style.transform = `translate(${s.left + 4}px,${s.top + 4}px)`;
        scrollAnchor.current.style.width = s.width + 'px';
        scrollAnchor.current.style.height = s.height + 'px';
        scrollAnchor.current?.scrollIntoView({
          block: 'nearest',
        });
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastSelIndex, layoutUpdateDate, uiStore.fileSelection.size]);

    return (
      // One div as the scrollable viewport
      <div
        className={className}
        onScroll={handleScroll}
        ref={wrapperRef}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
        onContextMenu={handleContextMenu}
      >
        {/* One div for the content */}
        <div style={{ width: containerWidth, height: containerHeight }}>
          {images.slice(startRenderIndex, endRenderIndex).map((im, index) => {
            const transform = layout.getItemLayout(startRenderIndex + index);
            return (
              <MasonryCell
                index={startRenderIndex + index}
                key={im.id}
                file={fileStore.fileList[startRenderIndex + index]}
                mounted
                uiStore={uiStore}
                fileStore={fileStore}
                transform={transform}
                // Force to load the full resolution image when the img dimensions on screen are larger than the thumbnail image resolution
                // Otherwise you'll see very low res images. This is usually only the case for images with extreme aspect ratios
                // TODO: Not the best solution; could generate multiple thumbnails of other resolutions
                forceNoThumbnail={
                  transform.width > thumbnailMaxSize || transform.height > thumbnailMaxSize
                }
              />
            );
          })}
          <div
            ref={scrollAnchor}
            // style={layout.getItemLayout(lastSelIndex)}
            id="invis-last-selected-item-for-scroll"
          />
        </div>
      </div>
    );
  },
);

export default VirtualizedRenderer;
