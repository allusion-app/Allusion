import { comboMatches, getKeyCombo, parseKeyCombo } from '../hotkeyParser';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useRef } from 'react';
import { Split } from 'widgets/Split';
import { useStore } from '../contexts/StoreContext';
import TagDnDContext, { DnDAttribute } from '../contexts/TagDnDContext';
import AppToolbar from './AppToolbar';
import ContentView from './ContentView';
import Outliner from './Outliner';
import { Preferences } from '../stores/Preferences';
import { clamp } from '../utils';

const Main = () => {
  const { uiStore, fileStore } = useStore();
  const data = useRef({ source: undefined, target: undefined });

  useEffect(() => {
    const handleDragEnd = (event: DragEvent) => {
      data.current.source = undefined;
      if (event.target instanceof HTMLElement) {
        event.target.dataset[DnDAttribute.Source] = 'false';
      }
    };

    const handleDrop = (event: DragEvent) => {
      data.current.target = undefined;
      if (event.target instanceof HTMLElement) {
        event.target.dataset[DnDAttribute.Target] = 'false';
      }
    };

    window.addEventListener('dragend', handleDragEnd, true);
    window.addEventListener('drop', handleDrop, true);

    return () => {
      window.removeEventListener('dragend', handleDragEnd);
      window.removeEventListener('drop', handleDrop);
    };
  }, []);

  const handleShortcuts = useRef(
    action((e: React.KeyboardEvent) => {
      if ((e.target as HTMLElement).matches?.('input')) return;
      const combo = getKeyCombo(e.nativeEvent);
      const matches = (c: string): boolean => {
        return comboMatches(combo, parseKeyCombo(c));
      };

      const { hotkeyMap } = uiStore.preferences;
      if (matches(hotkeyMap.selectAll)) {
        fileStore.selectAll();
      } else if (matches(hotkeyMap.deselectAll)) {
        fileStore.deselectAll();
      } else if (matches(hotkeyMap.openTagEditor)) {
        e.preventDefault();
        uiStore.openToolbarTagPopover();
      }
    }),
  );

  const handleMove = useRef(
    action((x: number, width: number) => {
      const { preferences } = uiStore;
      if (preferences.isOutlinerOpen) {
        const w = clamp(x, Preferences.MIN_OUTLINER_WIDTH, width * 0.75);
        preferences.outlinerWidth = w;

        // TODO: Automatically collapse if less than 3/4 of min-width?
        if (x < Preferences.MIN_OUTLINER_WIDTH * 0.75) {
          preferences.isOutlinerOpen = false;
        }
      } else if (x >= Preferences.MIN_OUTLINER_WIDTH) {
        preferences.isOutlinerOpen = true;
      }
    }),
  );

  return (
    <TagDnDContext.Provider value={data.current}>
      <Split
        id="window-splitter"
        primary={<Outliner />}
        secondary={
          <main id="main" onKeyDown={handleShortcuts.current}>
            <AppToolbar />
            <ContentView />
          </main>
        }
        axis="vertical"
        align="left"
        splitPoint={uiStore.preferences.outlinerWidth}
        isExpanded={uiStore.preferences.isOutlinerOpen}
        onMove={handleMove.current}
      />
    </TagDnDContext.Provider>
  );
};

export default observer(Main);
