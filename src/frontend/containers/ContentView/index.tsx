import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import StoreContext from '../../contexts/StoreContext';

import useContextMenu from '../../hooks/useContextMenu';

import { IconSet } from 'widgets';
import { ContextMenu, MenuSubItem, Menu, MenuChild, MenuDivider } from 'widgets/menus';

import Placeholder from './Placeholder';
import Layout from './LayoutSwitcher';

import { LayoutMenuItems, SortMenuItems, ThumbnailSizeMenuItems } from '../AppToolbar/Menus';
import TagDnDContext from 'src/frontend/contexts/TagDnDContext';

const ContentView = observer(() => {
  const {
    uiStore,
    fileStore: { fileList },
  } = useContext(StoreContext);

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
  const { fileStore, uiStore } = useContext(StoreContext);
  const dndData = useContext(TagDnDContext);
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

  return (
    <div
      ref={container}
      id="gallery-content"
      className={isDroppingTagOnSelection ? 'selected-file-dropping' : undefined}
      // Clear selection when clicking on the background, unless in slide mode: always needs an active image
      onClick={!uiStore.isSlideMode ? uiStore.clearFileSelection : undefined}
      onContextMenu={handleContextMenu} // Background clicks
    >
      <Layout
        contentRect={contentRect}
        showContextMenu={show}
        uiStore={uiStore}
        fileStore={fileStore}
      />
      <ContextMenu isOpen={open} x={x} y={y} close={hide}>
        <Menu>
          {fileMenu}
          {!uiStore.isSlideMode && (
            <>
              {fileMenu && <MenuDivider />}
              <MenuSubItem icon={IconSet.VIEW_GRID} text="View method...">
                <LayoutMenuItems uiStore={uiStore} />
              </MenuSubItem>
              <MenuSubItem icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
                <SortMenuItems fileStore={fileStore} />
              </MenuSubItem>
              <MenuSubItem icon={IconSet.THUMB_MD} text="Thumbnail size...">
                <ThumbnailSizeMenuItems uiStore={uiStore} />
              </MenuSubItem>
            </>
          )}
          {externalMenu && <MenuDivider />}
          {externalMenu}{' '}
        </Menu>
      </ContextMenu>
    </div>
  );
});

export default ContentView;
