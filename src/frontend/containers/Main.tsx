import { comboMatches, getKeyCombo, parseKeyCombo } from '@blueprintjs/core';
import { action, observable, runInAction } from 'mobx';
import React, { useCallback, useContext } from 'react';
import { Split } from 'widgets/Split';
import StoreContext from '../contexts/StoreContext';
import TagDnDContext, { DnDAttribute } from '../contexts/TagDnDContext';
import AppToolbar from './AppToolbar';
import ContentView from './ContentView';
import Outliner from './Outliner';

const TagDnDContextData = observable({ source: undefined, target: undefined });

window.addEventListener(
  'dragend',
  action((event: DragEvent) => {
    TagDnDContextData.source = undefined;
    if (event.target instanceof HTMLElement) {
      event.target.dataset[DnDAttribute.Source] = 'false';
    }
  }),
  true,
);

window.addEventListener(
  'drop',
  action((event: DragEvent) => {
    TagDnDContextData.target = undefined;
    if (event.target instanceof HTMLElement) {
      event.target.dataset[DnDAttribute.Target] = 'false';
    }
  }),
  true,
);

const Main = () => {
  const { uiStore } = useContext(StoreContext);

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
    <TagDnDContext.Provider value={TagDnDContextData}>
      <Split
        id="window-splitter"
        primary={<Outliner />}
        secondary={
          <main id="main" onKeyDown={handleShortcuts}>
            <AppToolbar />
            <ContentView />
          </main>
        }
        axis="vertical"
        splitPoint={uiStore.outlinerWidth}
        isExpanded={uiStore.isOutlinerOpen}
        onMove={uiStore.moveOutlinerSplitter}
      />
    </TagDnDContext.Provider>
  );
};

export default Main;
