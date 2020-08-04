import React, { useContext } from 'react';

import {
  Hotkey,
  Hotkeys,
  HotkeysTarget,
  ButtonGroup,
  Button,
  Icon,
  Divider,
} from '@blueprintjs/core';
import { observer, Observer } from 'mobx-react-lite';
import StoreContext, { IRootStoreProp, withRootstore } from '../../../contexts/StoreContext';
import TagsTree from './TagsTree';
import IconSet from 'components/Icons';

// Tooltip info
const enum Tooltip {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

const SystemTags = observer(() => {
  const { fileStore } = useContext(StoreContext);
  return (
    <ButtonGroup id="system-tags" vertical minimal fill>
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
          fileStore.showsUntaggedContent ? <Icon intent="primary" icon={IconSet.PREVIEW} /> : null
        }
        onClick={fileStore.fetchUntaggedFiles}
        active={fileStore.showsUntaggedContent}
        fill
        data-right={Tooltip.Untagged}
      />
      {fileStore.numMissingFiles > 0 && (
        <Button
          text={`Missing (${fileStore.numMissingFiles})`}
          icon={IconSet.WARNING_BROKEN_LINK}
          rightIcon={
            fileStore.showsMissingContent ? <Icon intent="primary" icon={IconSet.PREVIEW} /> : null
          }
          onClick={fileStore.fetchMissingFiles}
          active={fileStore.showsMissingContent}
          fill
          data-right={Tooltip.Missing}
        />
      )}
    </ButtonGroup>
  );
});

@HotkeysTarget
class TagPanelWithHotkeys extends React.PureComponent<IRootStoreProp> {
  render() {
    return (
      <div tabIndex={0}>
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
