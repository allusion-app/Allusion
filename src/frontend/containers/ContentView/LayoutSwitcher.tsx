import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useStore } from 'src/frontend/contexts/StoreContext';
import FocusManager from 'src/frontend/FocusManager';
import { ClientFile } from '../../../entities/File';
import { ViewMethod } from '../../stores/UiStore';
import { throttle } from 'common/timeout';
import { useCommandHandler } from './Commands';
import ListGallery from './ListGallery';
import MasonryRenderer from './Masonry/MasonryRenderer';
import SlideMode from './SlideMode';
import { ContentRect } from './utils';

interface LayoutProps {
  contentRect: ContentRect;
}

const Layout = ({ contentRect }: LayoutProps) => {
  const { fileStore, uiStore } = useStore();

  // Todo: Select by dragging a rectangle shape
  // Could maybe be accomplished with https://developer.mozilla.org/en-US/docs/Web/API/Intersection_Observer_API
  // Also take into account scrolling when dragging while selecting

  /** The first item that is selected in a multi-selection */
  const initialSelectionIndex = useRef<number>();
  /** The last item that is selected in a multi-selection */
  const lastSelectionIndex = useRef<number>();

  const handleFileSelect = useCallback(
    (selectedFile: ClientFile, toggleSelection: boolean, rangeSelection: boolean) => {
      /** The index of the actived item */
      const i = fileStore.getIndex(selectedFile.id);

      // If nothing is selected, initialize the selection range and select that single item
      if (lastSelectionIndex.current === undefined) {
        initialSelectionIndex.current = i;
        lastSelectionIndex.current = i;
        uiStore.toggleFileSelection(selectedFile, true);
        return;
      }
      // Mark this index as the last item that was selected
      lastSelectionIndex.current = i;

      if (rangeSelection && initialSelectionIndex.current !== undefined) {
        if (i === undefined) {
          return;
        }
        if (i < initialSelectionIndex.current) {
          uiStore.selectFileRange(i, initialSelectionIndex.current, toggleSelection);
        } else {
          uiStore.selectFileRange(initialSelectionIndex.current, i, toggleSelection);
        }
      } else if (toggleSelection) {
        uiStore.toggleFileSelection(selectedFile);
        initialSelectionIndex.current = fileStore.getIndex(selectedFile.id);
      } else {
        uiStore.selectFile(selectedFile, true);
        initialSelectionIndex.current = fileStore.getIndex(selectedFile.id);
      }
    },
    [fileStore, uiStore],
  );

  // Reset selection range when number of items changes: Else you can get phantom files when continuing your selection
  useEffect(() => {
    initialSelectionIndex.current = undefined;
    lastSelectionIndex.current = undefined;
  }, [fileStore.fileList.length]);

  useEffect(() => {
    const onKeyDown = action((e: KeyboardEvent) => {
      let index = lastSelectionIndex.current;
      if (index === undefined) {
        return;
      }
      if (uiStore.isSlideMode) {
        return;
      }
      if (e.key === 'ArrowLeft' && index > 0) {
        index -= 1;
        // When the activeElement GalleryItem goes out of view, focus will be handed over to the body element:
        // -> Gallery keyboard shortkeys stop working. So, force focus on Gallery container instead
        // But not when the TagEditor overlay is open: it will close onBlur
        if (!uiStore.isToolbarTagPopoverOpen) {
          FocusManager.focusGallery();
        }
      } else if (e.key === 'ArrowRight' && index < fileStore.fileList.length - 1) {
        index += 1;
        if (!uiStore.isToolbarTagPopoverOpen) {
          FocusManager.focusGallery();
        }
      } else {
        return;
      }
      handleFileSelect(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
    });

    const throttledKeyDown = throttle(onKeyDown, 50);

    window.addEventListener('keydown', throttledKeyDown);
    return () => window.removeEventListener('keydown', throttledKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore, handleFileSelect]);

  // delay unmount of slide view so end-transition can take place.
  // The `transitionEnd` prop is passed when slide mode is disabled,
  // triggering the transition, then X ms later the component is unmounted
  const { isSlideMode } = uiStore;
  const [delayedSlideMode, setDelayedSlideMode] = useState(uiStore.isSlideMode);
  useEffect(() => {
    let handle: number | undefined;
    if (isSlideMode) {
      setDelayedSlideMode(true);
    } else {
      handle = window.setTimeout(() => setDelayedSlideMode(false), 300);
    }

    return () => window.clearTimeout(handle);
  }, [isSlideMode]);

  useCommandHandler(handleFileSelect);

  if (contentRect.width < 10) {
    return null;
  }

  let overviewElem: React.ReactNode = undefined;
  switch (uiStore.method) {
    case ViewMethod.Grid:
    case ViewMethod.MasonryVertical:
    case ViewMethod.MasonryHorizontal:
      overviewElem = (
        <MasonryRenderer
          contentRect={contentRect}
          lastSelectionIndex={lastSelectionIndex}
          select={handleFileSelect}
        />
      );
      break;
    case ViewMethod.List:
      overviewElem = (
        <ListGallery
          contentRect={contentRect}
          select={handleFileSelect}
          lastSelectionIndex={lastSelectionIndex}
        />
      );
      break;
    default:
      overviewElem = 'unknown view method';
  }

  return (
    <>
      {overviewElem}
      {delayedSlideMode && uiStore.firstFileInView && <SlideMode contentRect={contentRect} />}
    </>
  );
};

export default observer(Layout);
