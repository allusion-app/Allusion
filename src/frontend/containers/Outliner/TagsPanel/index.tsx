import React from 'react';
import { comboMatches, getKeyCombo, parseKeyCombo } from '../../../hotkeyParser';
import { observer } from 'mobx-react-lite';

import { useStore } from '../../../contexts/StoreContext';

import { IconSet } from 'widgets';
import { Toolbar, ToolbarToggleButton } from 'widgets/menus';

import Panel from './TagsTree';
import { useAction } from 'src/frontend/hooks/useAction';

// Tooltip info
const enum TooltipInfo {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

export const OutlinerActionBar = observer(() => {
  const { fileStore, uiStore } = useStore();
  return (
    <Toolbar id="actionbar" label="Action Bar" controls="content-view">
      <ToolbarToggleButton
        showLabel="always"
        text={fileStore.numTotalFiles}
        icon={IconSet.MEDIA}
        onClick={uiStore.viewAllContent}
        pressed={uiStore.showsAllContent}
        tooltip={TooltipInfo.AllImages}
      />
      <ToolbarToggleButton
        showLabel="always"
        text={fileStore.numUntaggedFiles}
        icon={IconSet.TAG_BLANCO}
        onClick={uiStore.viewUntaggedContent}
        pressed={uiStore.showsUntaggedContent}
        tooltip={TooltipInfo.Untagged}
      />
      {fileStore.numMissingFiles > 0 && (
        <ToolbarToggleButton
          showLabel="always"
          text={fileStore.numMissingFiles}
          icon={IconSet.WARNING_FILL}
          onClick={uiStore.viewMissingContent}
          pressed={uiStore.showsMissingContent}
          tooltip={TooltipInfo.Missing}
        />
      )}
    </Toolbar>
  );
});

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
      <Panel />
    </div>
  );
};

export default TagsPanel;
