import React from 'react';

import { Hotkey, Hotkeys, Button, Icon, ButtonGroup, HotkeysTarget } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import IconSet from 'components/Icons';
import { IRootStoreProp, withRootstore } from '../../../contexts/StoreContext';
import TagsTree from './TagsTree';

// Tooltip info
const enum Tooltip {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
}

const TagsPanel = observer(({ rootStore }: IRootStoreProp) => {
  const { fileStore, tagCollectionStore, tagStore, uiStore } = rootStore;

  return (
    <>
      <TagsTree
        root={tagCollectionStore.getRootCollection()}
        uiStore={uiStore}
        tagCollectionStore={tagCollectionStore}
        tagStore={tagStore}
      />

      <div className="bp3-divider" />

      <div id="system-tags">
        <ButtonGroup vertical minimal fill>
          <Button
            text="All Images"
            icon={IconSet.MEDIA}
            rightIcon={
              fileStore.showsAllContent ? <Icon intent="primary" icon={IconSet.PREVIEW} /> : null
            }
            onClick={fileStore.fetchAllFiles}
            active={fileStore.showsAllContent}
            fill
            data-right={Tooltip.AllImages}
          />
          <Button
            text={`Untagged (${fileStore.numUntaggedFiles})`}
            icon={IconSet.TAG_BLANCO}
            rightIcon={
              fileStore.showsUntaggedContent ? (
                <Icon icon={IconSet.PREVIEW} />
              ) : fileStore.numUntaggedFiles > 0 ? (
                <Icon icon={IconSet.WARNING} />
              ) : null
            }
            onClick={fileStore.fetchUntaggedFiles}
            active={fileStore.showsUntaggedContent}
            fill
            data-right={Tooltip.Untagged}
          />
        </ButtonGroup>
      </div>
    </>
  );
});

@HotkeysTarget
class TagPanelWithHotkeys extends React.PureComponent<IRootStoreProp> {
  render() {
    return (
      <div tabIndex={0}>
        <TagsPanel rootStore={this.props.rootStore} />
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
