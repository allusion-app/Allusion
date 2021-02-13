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
  onDrop?: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragStart?: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragEnter?: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragOver?: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
  onDragLeave?: (e: React.DragEvent<HTMLDivElement>, index: number) => void;
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
    ...restProps
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

      const start = findViewportEdge(yOffset - overdraw, numImages, layout, false);
      const end = findViewportEdge(yOffset + viewportHeight + overdraw, numImages, layout, true);

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
            const fileListIndex = startRenderIndex + index;
            const transform = layout.getItemLayout(fileListIndex);
            return (
              <MasonryCell
                index={fileListIndex}
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
                onDragStart={(e) => restProps.onDragStart?.(e, fileListIndex)}
                onDragEnter={(e) => restProps.onDragEnter?.(e, fileListIndex)}
                onDragOver={(e) => restProps.onDragOver?.(e, fileListIndex)}
                onDragLeave={(e) => restProps.onDragLeave?.(e, fileListIndex)}
                onDrop={(e) => restProps.onDrop?.(e, fileListIndex)}
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
