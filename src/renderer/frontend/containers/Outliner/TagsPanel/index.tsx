import React, { useContext } from 'react';

import {
  Hotkey,
  Hotkeys,
  HotkeysTarget,
  ButtonGroup,
  Button,
  Icon,
  Divider,
  Tooltip,
} from '@blueprintjs/core';
import { observer, Observer } from 'mobx-react-lite';
import StoreContext, { IRootStoreProp, withRootstore } from '../../../contexts/StoreContext';
import TagsTree from './TagsTree';
import IconSet from 'components/Icons';

// Tooltip info
const enum TooltipInfo {
  AllImages = 'View all images in library',
  Untagged = 'View all untagged images',
  Missing = 'View missing images on your system',
}

const SystemTags = observer(() => {
  const { fileStore } = useContext(StoreContext);
  return (
    <ButtonGroup id="system-tags" vertical minimal fill>
      <Tooltip usePortal={false} openOnTargetFocus={false} content={TooltipInfo.AllImages}>
        <Button
          text="All Images"
          icon={IconSet.MEDIA}
          rightIcon={
            fileStore.showsAllContent ? <Icon intent="primary" icon={IconSet.PREVIEW} /> : null
          }
          onClick={fileStore.fetchAllFiles}
          active={fileStore.showsAllContent}
          fill
        />
      </Tooltip>
      <Tooltip usePortal={false} openOnTargetFocus={false} content={TooltipInfo.Untagged}>
        <Button
          text={`Untagged (${fileStore.numUntaggedFiles})`}
          icon={IconSet.TAG_BLANCO}
          rightIcon={
            fileStore.showsUntaggedContent ? <Icon intent="primary" icon={IconSet.PREVIEW} /> : null
          }
          onClick={fileStore.fetchUntaggedFiles}
          active={fileStore.showsUntaggedContent}
          fill
        />
      </Tooltip>
      {fileStore.numMissingFiles > 0 && (
        <Tooltip usePortal={false} openOnTargetFocus={false} content={TooltipInfo.Missing}>
          <Button
            text={`Missing (${fileStore.numMissingFiles})`}
            icon={IconSet.WARNING_BROKEN_LINK}
            rightIcon={
              fileStore.showsMissingContent ? (
                <Icon intent="primary" icon={IconSet.PREVIEW} />
              ) : null
            }
            onClick={fileStore.fetchMissingFiles}
            active={fileStore.showsMissingContent}
            fill
          />
        </Tooltip>
      )}
    </ButtonGroup>
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
