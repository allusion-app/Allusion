import React from 'react';
import { comboMatches, getKeyCombo, parseKeyCombo } from '../../../hotkeyParser';

import { useStore } from '../../../contexts/StoreContext';

import TagsTree from './TagsTree';
import { useAction } from 'src/frontend/hooks/useAction';

const TagsPanel = () => {
  const { uiStore, tagStore } = useStore();

  const handleShortcuts = useAction((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).matches?.('input')) {
      return;
    }
    const combo = getKeyCombo(e.nativeEvent);
    const matches = (c: string): boolean => {
      return comboMatches(combo, parseKeyCombo(c));
    };

    const { hotkeyMap } = uiStore.preferences;
    if (matches(hotkeyMap.selectAll)) {
      tagStore.selectAll();
    } else if (matches(hotkeyMap.deselectAll)) {
      tagStore.deselectAll();
    }
  });

  return (
    <div onKeyDown={handleShortcuts} className="section">
      <TagsTree />
    </div>
  );
};

export default TagsPanel;
