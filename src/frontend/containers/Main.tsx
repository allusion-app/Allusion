import { comboMatches, getKeyCombo, parseKeyCombo } from '@blueprintjs/core';
import { runInAction } from 'mobx';
import React, { useCallback, useContext } from 'react';
import StoreContext from '../contexts/StoreContext';
import AppToolbar from './AppToolbar';
import ContentView from './ContentView';

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
        }
      });
    },
    [uiStore],
  );

  return (
    <main id="main" onKeyDown={handleShortcuts}>
      <AppToolbar />
      <ContentView />
    </main>
  );
};

export default Main;
