import React, { useCallback, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from '../../contexts/StoreContext';

import useContextMenu from '../../hooks/useContextMenu';

import { IconSet } from 'widgets';
import { ContextMenu, MenuSubItem, Menu, MenuChild, MenuDivider } from 'widgets/menus';

import Placeholder from './Placeholder';
import Layout from './LayoutSwitcher';

import { LayoutMenuItems, SortMenuItems } from '../AppToolbar/Menus';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { runInAction } from 'mobx';
import { MoveFilesToTrashBin } from 'src/frontend/components/RemovalAlert';

const ContentView = observer(() => {
  const {
    uiStore,
    fileStore: { fileList },
  } = useStore();

  return (
    <div
      id="content-view"
      className={`thumbnail-${uiStore.thumbnailSize} thumbnail-${uiStore.thumbnailShape}`}
    >
      {fileList.length === 0 ? <Placeholder /> : <Content />}
    </div>
  );
});

const Content = observer(() => {
  const { fileStore, uiStore } = useStore();
  const dndData = useTagDnD();
  const [contextState, { show, hide }] = useContextMenu({ initialMenu: [<></>, <></>] });
  const { open, x, y, menu } = contextState;
  const [fileMenu, externalMenu] = menu as [MenuChild, MenuChild];
  const { fileList } = fileStore;
  const [contentRect, setContentRect] = useState({ width: 1, height: 1 });
  const container = useRef<HTMLDivElement>(null);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      show(e.clientX, e.clientY, []);
    },
    [show],
  );

  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      const {
        contentRect: { width, height },
      } = entries[0];
      setContentRect({ width, height });
    }),
  );

  useEffect(() => {
    const observer = resizeObserver.current;
    if (container.current) {
      resizeObserver.current.observe(container.current);
    }
    return () => observer.disconnect();
  }, [fileList.length]);

  const isDroppingTagOnSelection =
    dndData.target !== undefined && uiStore.fileSelection.has(dndData.target);

  const clearFileSelection = useCallback(
    (e: React.MouseEvent) => {
      const isSlideMode = runInAction(() => uiStore.isSlideMode);
      const isLayout = e.currentTarget.firstElementChild?.contains(e.target as Node);
      if (!isSlideMode && isLayout) {
        uiStore.clearFileSelection();
      }
    },
    [uiStore],
  );

  return (
    <div
      ref={container}
      id="gallery-content"
      data-show-filename={uiStore.isThumbnailFilenameOverlayEnabled}
      data-selected-file-dropping={isDroppingTagOnSelection}
      onContextMenu={handleContextMenu}
      // Clear selection when clicking on the background, unless in slide mode: always needs an active image
      onClick={clearFileSelection}
    >
      <Layout contentRect={contentRect} showContextMenu={show} />

      <ContextMenu isOpen={open} x={x} y={y} close={hide}>
        <Menu>
          {fileMenu}
          {!uiStore.isSlideMode && (
            <>
              {fileMenu && <MenuDivider />}
              <MenuSubItem icon={IconSet.VIEW_GRID} text="View method...">
                <LayoutMenuItems />
              </MenuSubItem>
              <MenuSubItem icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
                <SortMenuItems />
              </MenuSubItem>
            </>
          )}
          {externalMenu && <MenuDivider />}
          {externalMenu}{' '}
        </Menu>
      </ContextMenu>

      <MoveFilesToTrashBin />
    </div>
  );
});

Content.displayName = 'Gallery';

export default ContentView;
