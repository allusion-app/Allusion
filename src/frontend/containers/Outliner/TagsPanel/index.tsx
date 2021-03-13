import React, { useCallback, useContext } from 'react';
import { comboMatches, getKeyCombo, parseKeyCombo } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { runInAction } from 'mobx';

import StoreContext from '../../../contexts/StoreContext';

import { IconSet } from 'widgets';
import { Toolbar, ToolbarToggleButton } from 'widgets/menus';

import TagsTree from './TagsTree';

// Tooltip info
const enum TooltipInfo {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

export const OutlinerActionBar = observer(() => {
  const { fileStore } = useContext(StoreContext);
  return (
    <Toolbar id="actionbar" label="Action Bar" controls="content-view">
      <ToolbarToggleButton
        showLabel="always"
        text={fileStore.numTotalFiles}
        icon={IconSet.MEDIA}
        onClick={fileStore.fetchAllFiles}
        pressed={fileStore.showsAllContent}
        tooltip={TooltipInfo.AllImages}
      />
      <ToolbarToggleButton
        showLabel="always"
        text={fileStore.numUntaggedFiles}
        icon={IconSet.TAG_BLANCO}
        onClick={fileStore.fetchUntaggedFiles}
        pressed={fileStore.showsUntaggedContent}
        tooltip={TooltipInfo.Untagged}
      />
      {fileStore.numMissingFiles > 0 && (
        <ToolbarToggleButton
          showLabel="always"
          text={fileStore.numMissingFiles}
          icon={IconSet.WARNING_FILL}
          onClick={fileStore.fetchMissingFiles}
          pressed={fileStore.showsMissingContent}
          tooltip={TooltipInfo.Missing}
        />
      )}
    </Toolbar>
  );
});

const TagsPanel = () => {
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
          uiStore.selectAllTags();
        } else if (matches(hotkeyMap.deselectAll)) {
          uiStore.clearTagSelection();
        }
      });
    },
    [uiStore],
  );

  return (
    <div onKeyDown={handleShortcuts} className="section">
      <TagsTree />
    </div>
  );
};

export default TagsPanel;
