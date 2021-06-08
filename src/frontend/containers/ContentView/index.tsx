import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';

import { useStore } from '../../contexts/StoreContext';

import useContextMenu from '../../hooks/useContextMenu';

import { IconSet } from 'widgets';
import { ContextMenu, MenuSubItem, Menu, MenuChild, MenuDivider } from 'widgets/menus';

import Placeholder from './Placeholder';
import Layout from './LayoutSwitcher';

import { LayoutMenuItems, SortMenuItems, ThumbnailSizeMenuItems } from '../AppToolbar/Menus';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { useAction } from 'src/frontend/hooks/useAction';

const ContentView = observer(() => {
  const {
    uiStore: { preferences },
    fileStore: { fileList },
  } = useStore();

  return (
    <div
      id="content-view"
      className={`thumbnail-${preferences.thumbnailSize} thumbnail-${preferences.thumbnailShape}`}
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

  const handleContextMenu = useRef((e: React.MouseEvent) => show(e.clientX, e.clientY, [])).current;

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
      observer.observe(container.current);
    }
    return () => observer.disconnect();
  }, [fileList.length]);

  const isDroppingTagOnSelection =
    dndData.target !== undefined && fileStore.selection.has(dndData.target);

  const clearFileSelection = useAction((e: React.MouseEvent) => {
    const isLayout = e.currentTarget.firstElementChild?.contains(e.target as Node);
    if (!uiStore.isSlideMode && isLayout) {
      fileStore.deselectAll();
    }
  });

  return (
    <div
      ref={container}
      id="gallery-content"
      data-show-filename={uiStore.preferences.showThumbnailFilename}
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
              <MenuSubItem icon={IconSet.THUMB_MD} text="Thumbnail size...">
                <ThumbnailSizeMenuItems />
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

Content.displayName = 'Gallery';

export default ContentView;
