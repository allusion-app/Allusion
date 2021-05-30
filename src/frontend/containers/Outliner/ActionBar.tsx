import { observer } from 'mobx-react-lite';
import React from 'react';

import { useStore } from '../../contexts/StoreContext';
import { IconSet } from 'widgets';
import { Toolbar, ToolbarToggleButton } from 'widgets/menus';

// Tooltip info
const enum TooltipInfo {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

const ActionBar = observer(() => {
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

export default ActionBar;
