import React, { useCallback, useContext, useEffect, useRef, useState } from 'react';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import { comboMatches, getKeyCombo, parseKeyCombo } from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';

import useContextMenu from '../../hooks/useContextMenu';

import { IconSet } from 'widgets';
import { ContextMenu, MenuSubItem, Menu, MenuDivider, MenuChild } from 'widgets/menus';

import Placeholder from './Placeholder';
import Layout from './Gallery';

import { LayoutMenuItems, SortMenuItems } from '../AppToolbar/Menus';

const ContentView = observer(() => {
  const {
    uiStore,
    fileStore: { fileList },
  } = useContext(StoreContext);

  const handleShortcuts = useCallback(
    (e: React.KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.('input')) return;
      const combo = getKeyCombo(e.nativeEvent);
      const matches = (c: string): boolean => {
        return comboMatches(combo, parseKeyCombo(c));
      };
      runInAction(() => {
        const { hotkeyMap } = uiStore;
        if (matches(hotkeyMap.selectAll)) {
          uiStore.selectAllFiles();
        } else if (matches(hotkeyMap.deselectAll)) {
          uiStore.clearFileSelection();
        } else if (matches(hotkeyMap.openTagEditor)) {
          e.preventDefault();
          uiStore.openToolbarTagPopover();
        }
      });
    },
    [uiStore],
  );

  return (
    <main id="content-view" onKeyDown={handleShortcuts}>
      {fileList.length === 0 ? <Placeholder /> : <Gallery />}
    </main>
  );
});

const Gallery = observer(() => {
  const { fileStore, uiStore } = useContext(StoreContext);
  const [contextState, { show, hide }] = useContextMenu({ initialMenu: [<></>, <></>] });
  const { open, x, y, menu } = contextState;
  const [fileMenu, externalMenu] = menu as [MenuChild, MenuChild];
  const { fileList } = fileStore;
  const [contentRect, setContentRect] = useState({ width: 1, height: 1 });
  const container = useRef<HTMLDivElement>(null);

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

  return (
    <div
      ref={container}
      id="gallery-content"
      className={`thumbnail-${uiStore.thumbnailSize} thumbnail-${uiStore.thumbnailShape}`}
      // Clear selection when clicking on the background, unless in slide mode: always needs an active image
      onClick={!uiStore.isSlideMode ? uiStore.clearFileSelection : undefined}
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
          <MenuDivider />
          <MenuSubItem icon={IconSet.VIEW_GRID} text="View method...">
            <LayoutMenuItems uiStore={uiStore} />
          </MenuSubItem>
          <MenuSubItem icon={IconSet.FILTER_NAME_DOWN} text="Sort by...">
            <SortMenuItems fileStore={fileStore} />
          </MenuSubItem>
          <MenuDivider />
          {externalMenu}
        </Menu>
      </ContextMenu>
    </div>
  );
});

export default ContentView;
