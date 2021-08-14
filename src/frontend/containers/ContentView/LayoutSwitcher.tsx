import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef } from 'react';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { ITagDnDData } from 'src/frontend/contexts/TagDnDContext';
import { RendererMessenger } from 'src/Messaging';
import { MenuDivider } from 'widgets/menus';
import { ClientFile } from '../../../entities/File';
import UiStore, { ViewMethod } from '../../stores/UiStore';
import { throttle } from '../../utils';
import { GalleryCommand, GallerySelector } from './GalleryItem';
import ListGallery from './ListGallery';
import MasonryRenderer from './Masonry/MasonryRenderer';
import {
  ExternalAppMenuItems,
  FileTagMenuItems,
  FileViewerMenuItems,
  MissingFileMenuItems,
  SlideFileViewerMenuItems,
} from './menu-items';
import SlideMode from './SlideMode';

type Dimension = { width: number; height: number };

export interface ILayoutProps {
  contentRect: Dimension;
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void;
  /** The index of the currently selected image, or the "last selected" image when a range is selected */
  lastSelectionIndex: React.MutableRefObject<number | undefined>;
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
}

const Layout = ({
  contentRect,
  showContextMenu,
}: Omit<ILayoutProps, 'select' | 'lastSelectionIndex'>) => {
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
    const onKeyDown = (e: KeyboardEvent) => {
      runInAction(() => {
        let index = lastSelectionIndex.current;
        if (index === undefined) {
          return;
        }
        if (runInAction(() => uiStore.isSlideMode)) {
          return;
        }
        if (e.key === 'ArrowLeft' && index > 0) {
          index -= 1;
        } else if (e.key === 'ArrowRight' && index < fileStore.fileList.length - 1) {
          index += 1;
        } else {
          return;
        }
        handleFileSelect(fileStore.fileList[index], e.ctrlKey || e.metaKey, e.shiftKey);
      });
    };

    const throttledKeyDown = throttle(onKeyDown, 50);

    window.addEventListener('keydown', throttledKeyDown);
    return () => window.removeEventListener('keydown', throttledKeyDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileStore, handleFileSelect]);

  // TODO: Keep masonry layout active while slide is open: no loading time when returning
  if (uiStore.isSlideMode) {
    return <SlideMode contentRect={contentRect} showContextMenu={showContextMenu} />;
  }
  if (contentRect.width < 10) {
    return null;
  }
  switch (uiStore.method) {
    case ViewMethod.Grid:
    case ViewMethod.MasonryVertical:
    case ViewMethod.MasonryHorizontal:
      return (
        <MasonryRenderer
          contentRect={contentRect}
          type={uiStore.method}
          lastSelectionIndex={lastSelectionIndex}
          showContextMenu={showContextMenu}
          select={handleFileSelect}
          handleFileSelect={handleFileSelect}
        />
      );
    case ViewMethod.List:
      return (
        <ListGallery
          contentRect={contentRect}
          select={handleFileSelect}
          lastSelectionIndex={lastSelectionIndex}
          showContextMenu={showContextMenu}
          handleFileSelect={handleFileSelect}
        />
      );
    default:
      return null;
  }
};

export default observer(Layout);

const PADDING = 8;
const CELL_SIZE_SMALL = 160 + PADDING;
const CELL_SIZE_MEDIUM = 240 + PADDING;
const CELL_SIZE_LARGE = 320 + PADDING;

export function getThumbnailSize(sizeType: 'small' | 'medium' | 'large') {
  if (sizeType === 'small') {
    return CELL_SIZE_SMALL;
  } else if (sizeType === 'medium') {
    return CELL_SIZE_MEDIUM;
  }
  return CELL_SIZE_LARGE;
}

export function createSubmitCommand(
  dndData: ITagDnDData,
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void,
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void,
  uiStore: UiStore,
): (command: GalleryCommand) => void {
  return action((command: GalleryCommand) => {
    switch (command.selector) {
      case GallerySelector.Click: {
        const [file, metaKey, shitfKey] = command.payload;
        select(file, metaKey, shitfKey);
        break;
      }

      case GallerySelector.DoubleClick:
        if (!command.payload.isBroken) {
          uiStore.selectFile(command.payload, true);
          uiStore.enableSlideMode();
        }
        break;

      case GallerySelector.ContextMenu: {
        const [file, x, y, tag] = command.payload;
        let topMenu = file.isBroken ? (
          <MissingFileMenuItems />
        ) : (
          <FileViewerMenuItems file={file} />
        );
        if (tag) {
          topMenu = (
            <>
              <FileTagMenuItems file={file} tag={tag} />
              <MenuDivider />
              {topMenu}
            </>
          );
        }
        showContextMenu(x, y, [topMenu, <ExternalAppMenuItems key="external" file={file} />]);
        if (!uiStore.fileSelection.has(file)) {
          // replace selection with context menu, like Windows file explorer
          select(file, false, false);
        }
        break;
      }

      case GallerySelector.ContextMenuSlide: {
        const [file, x, y] = command.payload;
        showContextMenu(x, y, [
          file.isBroken ? <MissingFileMenuItems /> : <SlideFileViewerMenuItems file={file} />,
          <ExternalAppMenuItems key="external" file={file} />,
        ]);
        break;
      }

      // If the file is selected, add all selected items to the drag event, for
      // exporting to your file explorer or programs like PureRef.
      // Creating an event in the main process turned out to be the most robust,
      // did many experiments with drag event content types. Creating a drag
      // event with multiple images did not work correctly from the browser side
      // (e.g. only limited to thumbnails, not full images).
      case GallerySelector.DragStart: {
        const file = command.payload;
        if (!uiStore.fileSelection.has(file)) {
          return;
        }
        if (uiStore.fileSelection.size > 1) {
          RendererMessenger.startDragExport(
            Array.from(uiStore.fileSelection, (f) => f.absolutePath),
          );
        } else {
          RendererMessenger.startDragExport([file.absolutePath]);
        }

        // However, from the main process, there is no way to attach some information to indicate it's an "internal event" that shouldn't trigger the drop overlay
        // So we can store the date when the event starts... Hacky but it works :)
        (window as any).internalDragStart = new Date();
      }

      case GallerySelector.DragOver:
        dndData.target = command.payload;
        break;

      case GallerySelector.DragLeave:
        dndData.target = command.payload;
        break;

      case GallerySelector.Drop:
        if (dndData.source !== undefined) {
          const dropFile = command.payload;
          const ctx = uiStore.getTagContextItems(dndData.source.id);

          // Tag all selected files - unless the file that is being tagged is not selected
          const filesToTag = uiStore.fileSelection.has(dropFile)
            ? [...uiStore.fileSelection]
            : [dropFile];

          for (const tag of ctx) {
            for (const file of filesToTag) {
              file.addTag(tag);
            }
          }
        }

      default:
        break;
    }
  });
}
