import React, { useContext } from 'react';

import { Hotkey, Hotkeys, HotkeysTarget, Divider } from '@blueprintjs/core';
import { observer, Observer } from 'mobx-react-lite';
import StoreContext, { IRootStoreProp, withRootstore } from '../../../contexts/StoreContext';
import TagsTree from './TagsTree';
import IconSet from 'components/Icons';
import { Toolbar, ToolbarToggleButton } from 'components';

// Tooltip info
const enum TooltipInfo {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

const SystemTags = observer(() => {
  const { fileStore } = useContext(StoreContext);
  return (
    <Toolbar id="system-tags" label="System Tags" controls="gallery-content">
      <ToolbarToggleButton
        showLabel="always"
        label={`${fileStore.fileList.length}`}
        icon={IconSet.MEDIA}
        onClick={fileStore.fetchAllFiles}
        pressed={fileStore.showsAllContent}
        tooltip={TooltipInfo.AllImages}
      />
      <ToolbarToggleButton
        showLabel="always"
        label={`${fileStore.numUntaggedFiles}`}
        icon={IconSet.TAG_BLANCO}
        onClick={fileStore.fetchUntaggedFiles}
        pressed={fileStore.showsUntaggedContent}
        tooltip={TooltipInfo.Untagged}
      />
      {fileStore.numMissingFiles > 0 && (
        <ToolbarToggleButton
          showLabel="always"
          label={`${fileStore.numMissingFiles}`}
          icon={IconSet.WARNING_BROKEN_LINK}
          onClick={fileStore.fetchMissingFiles}
          pressed={fileStore.showsMissingContent}
          tooltip={TooltipInfo.Missing}
        />
      )}
    </Toolbar>
  );
});

@HotkeysTarget
class TagPanelWithHotkeys extends React.PureComponent<IRootStoreProp> {
  render() {
    return (
      <div>
        <Observer>
          {() => {
            const { tagCollectionStore, tagStore, uiStore } = this.props.rootStore;
            return (
              <TagsTree
                root={tagCollectionStore.getRootCollection()}
                uiStore={uiStore}
                tagCollectionStore={tagCollectionStore}
                tagStore={tagStore}
              />
            );
          }}
        </Observer>
        <Divider />
        <SystemTags />
      </div>
    );
  }
  selectAllTags = () => {
    this.props.rootStore.uiStore.selectTags(this.props.rootStore.tagStore.tagList.toJS());
  };
  renderHotkeys() {
    const { uiStore } = this.props.rootStore;
    const { hotkeyMap } = uiStore;
    return (
      <Hotkeys>
        <Hotkey
          combo={hotkeyMap.selectAll}
          label="Select all tags in the outliner"
          onKeyDown={this.selectAllTags}
          group="Outliner"
        />
        <Hotkey
          combo={hotkeyMap.deselectAll}
          label="Deselect all tags in the outliner"
          onKeyDown={uiStore.clearTagSelection}
          group="Outliner"
        />
      </Hotkeys>
    );
  }
}

export default withRootstore(TagPanelWithHotkeys);
