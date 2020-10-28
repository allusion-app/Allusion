import React, { useCallback, useContext } from 'react';
import { runInAction } from 'mobx';
import { comboMatches, getKeyCombo, parseKeyCombo } from '@blueprintjs/core';

import StoreContext from '../../contexts/StoreContext';
import Gallery from './Gallery';

const ContentView = () => {
  const { uiStore } = useContext(StoreContext);

  const handleShortcuts = useCallback(
    (e: React.KeyboardEvent) => {
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
    // TODO: Remove tabIndex once focus navigation has been added.
    <main tabIndex={0} onKeyDown={handleShortcuts}>
      <Gallery />
    </main>
  );
};

export default ContentView;
