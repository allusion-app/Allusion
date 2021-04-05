import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { thumbnailMaxSize } from 'src/config';
import { ClientFile } from 'src/entities/File';
import StoreContext from 'src/frontend/contexts/StoreContext';
import TagDnDContext from 'src/frontend/contexts/TagDnDContext';
import useMountState from 'src/frontend/hooks/useMountState';
import { debouncedThrottle } from 'src/frontend/utils';
import { createSubmitCommand, ILayoutProps } from '../Gallery';
import { MasonryCell } from '../GalleryItem';
import { findViewportEdge, Layouter } from './layout-helpers';

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
    overscan = 0,
    select,
    showContextMenu,
    lastSelectionIndex,
    layoutUpdateDate,
  }: IRendererProps & Pick<ILayoutProps, 'select' | 'showContextMenu' | 'lastSelectionIndex'>) => {
    const { uiStore, fileStore } = useContext(StoreContext);
    const [, isMountedRef] = useMountState();
    const wrapperRef = useRef<HTMLDivElement>(null);
    const scrollAnchor = useRef<HTMLDivElement>(null);
    const [startRenderIndex, setStartRenderIndex] = useState(0);
    const [endRenderIndex, setEndRenderIndex] = useState(0);
    const dndData = useContext(TagDnDContext);
    const submitCommand = useMemo(
      () => createSubmitCommand(dndData, fileStore, select, showContextMenu, uiStore),
      [dndData, fileStore, select, showContextMenu, uiStore],
    );
    const numImages = images.length;

    const determineRenderRegion = useCallback(
      (numImages: number, overdraw: number, setFirstItem = true) => {
        if (!isMountedRef.current) return;
        const viewport = wrapperRef.current;
        const yOffset = viewport?.scrollTop || 0;
        const viewportHeight = viewport?.clientHeight || 0;

        const firstImageIndex = findViewportEdge(yOffset, numImages, layout, false);
        const start = findViewportEdge(yOffset - overdraw, numImages, layout, false);
        const end = findViewportEdge(yOffset + viewportHeight + overdraw, numImages, layout, true);

        setStartRenderIndex(start);
        setEndRenderIndex(Math.min(end, start + 256)); // hard limit of 256 images at once, for safety reasons (we don't want any exploding computers). Might be bad for people with 4k screens and small thumbnails...

        // store the first item in the viewport in the UIStore so that switching between view modes retains the scroll position
        if (setFirstItem) uiStore.setFirstItem(firstImageIndex);
      },
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [],
    );

    const throttledRedetermine = useRef(
      debouncedThrottle(
        (numImages: number, overdraw: number, setFirstItem?: boolean) =>
          determineRenderRegion(numImages, overdraw, setFirstItem),
        100,
      ),
    );

    // Redetermine images in viewport when amount of images or the container dimensions change
    useLayoutEffect(() => {
      // setFirstItem = false: don't set the firstItem in view, so we can recover scroll position after layout updates,
      // in the useLayoutEffect with layoutUpdateDate dependency
      throttledRedetermine.current(numImages, overscan, false);
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [numImages, containerWidth, containerHeight]);

    const handleScroll = useCallback(() => throttledRedetermine.current(numImages, overscan || 0), [
      numImages,
      overscan,
    ]);

    const scrollToIndex = useCallback(
      (index: number, block: 'nearest' | 'start' | 'end' | 'center' = 'nearest') => {
        if (!scrollAnchor.current) return;
        const s = layout.getItemLayout(index);
        // Scroll to invisible element, positioned at selected item,
        // just for scroll automatisation with scrollIntoView
        scrollAnchor.current.style.transform = `translate(${s.left}px,${s.top}px)`;
        scrollAnchor.current.style.width = s.width + 'px';
        scrollAnchor.current.style.height = s.height + 'px';
        scrollAnchor.current?.scrollIntoView({ block });
      },
      [layout],
    );

    // The index currently selected image, or the "last selected" image when a range is selected,
    const lastSelIndex = lastSelectionIndex.current
      ? Math.min(lastSelectionIndex.current, numImages - 1)
      : undefined;

    // When layout updates, scroll to firstImage (e.g. resize or thumbnail size changed)
    // This also sets the initial scroll position on initial render, for when coming from another view mode
    useLayoutEffect(() => {
      runInAction(() => {
        scrollToIndex(uiStore.firstItem, 'start');
      });
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [layoutUpdateDate]);

    // When selection changes, scroll to last selected image. Nice when using cursor keys for navigation
    const fileSelectionSize = uiStore.fileSelection.size;
    useLayoutEffect(() => {
      // But don't scroll when there are no files selected:
      // else you will scroll when the user deselects everything
      if (lastSelIndex !== undefined && fileSelectionSize > 0) {
        scrollToIndex(lastSelIndex);
      }
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [lastSelIndex, fileSelectionSize]);

    return (
      // One div as the scrollable viewport
      <div className={className} onScroll={handleScroll} ref={wrapperRef}>
        {/* One div for the content */}
        <div style={{ width: containerWidth, height: containerHeight }}>
          {images.slice(startRenderIndex, endRenderIndex + 1).map((im, index) => {
            const fileListIndex = startRenderIndex + index;
            const transform = layout.getItemLayout(fileListIndex);
            return (
              <MasonryCell
                key={im.id}
                file={fileStore.fileList[fileListIndex]}
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
                submitCommand={submitCommand}
              />
            );
          })}
          <div ref={scrollAnchor} id="invis-last-selected-item-for-scroll" />
        </div>
      </div>
    );
  },
);

export default VirtualizedRenderer;
