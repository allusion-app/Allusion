import React from 'react';
import { comboMatches, getKeyCombo, parseKeyCombo } from '../../../hotkeyParser';
import { observer } from 'mobx-react-lite';

import { useStore } from '../../../contexts/StoreContext';

import { IconSet } from 'widgets';
import { Toolbar, ToolbarButton } from 'widgets/menus';

import TagsTree from './TagsTree';
import { useAction } from 'src/frontend/hooks/mobx';

// Tooltip info
const enum TooltipInfo {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

export const OutlinerActionBar = observer(() => {
  const { fileStore } = useStore();
  return (
    <Toolbar id="actionbar" label="Action Bar" controls="content-view">
      <ToolbarButton
        text={fileStore.numTotalFiles}
        icon={IconSet.MEDIA}
        onClick={fileStore.fetchAllFiles}
        pressed={fileStore.showsAllContent}
        tooltip={TooltipInfo.AllImages}
      />
      <ToolbarButton
        text={fileStore.numUntaggedFiles}
        icon={IconSet.TAG_BLANCO}
        onClick={fileStore.fetchUntaggedFiles}
        pressed={fileStore.showsUntaggedContent}
        tooltip={TooltipInfo.Untagged}
      />
      {fileStore.numMissingFiles > 0 && (
        <ToolbarButton
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
  const { uiStore } = useStore();

  const handleShortcuts = useAction((e: React.KeyboardEvent) => {
    if ((e.target as HTMLElement).matches('input')) {
      return;
    }
    const combo = getKeyCombo(e.nativeEvent);
    const matches = (c: string): boolean => {
      return comboMatches(combo, parseKeyCombo(c));
    };
    const { hotkeyMap } = uiStore;
    if (matches(hotkeyMap.selectAll)) {
      uiStore.selectAllTags();
    } else if (matches(hotkeyMap.deselectAll)) {
      uiStore.clearTagSelection();
    }
  });

  return (
    <div onKeyDown={handleShortcuts} className="section">
      <TagsTree />
    </div>
  );
};

export default TagsPanel;
