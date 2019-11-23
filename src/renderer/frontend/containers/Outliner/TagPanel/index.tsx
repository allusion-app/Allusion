import React from 'react';

import { Hotkey, Hotkeys, Button, Icon, ButtonGroup, HotkeysTarget } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import IconSet from '../../../components/Icons';
import { IRootStoreProp, withRootstore } from '../../../contexts/StoreContext';

import { DragLayer } from './DragLayer';
import TagTree from './TagTree';

export const enum DragAndDropType {
  Collection = 'collection',
  Tag = 'tag',
}

const TagPanel = observer(({ rootStore }: IRootStoreProp) => {
  const { uiStore, fileStore } = rootStore;

  return (
    <div tabIndex={0}>
      <TagTree rootStore={rootStore} />

      <div className="bp3-divider" />

      <div id="system-tags">
        <ButtonGroup vertical minimal fill>
          <Button
            text="All Images"
            icon={IconSet.MEDIA}
            rightIcon={
              uiStore.view.showsAllContent ? (
                <Icon intent="primary" icon={IconSet.PREVIEW} />
              ) : null
            }
            onClick={uiStore.viewAllContent}
            active={uiStore.view.showsAllContent}
            fill
          />
          <Button
            text={`Untagged (${fileStore.numUntaggedFiles})`}
            icon={IconSet.TAG_BLANCO}
            rightIcon={
              uiStore.view.showsUntaggedContent ? (
                <Icon icon={IconSet.PREVIEW} />
              ) : fileStore.numUntaggedFiles > 0 ? (
                <Icon icon={IconSet.WARNING} />
              ) : null
            }
            onClick={uiStore.viewUntaggedContent}
            active={uiStore.view.showsUntaggedContent}
            fill
          />
        </ButtonGroup>
      </div>
    </div>
  );
});

@HotkeysTarget
class TagPanelWithHotkeys extends React.PureComponent<IRootStoreProp, {}> {
  render() {
    return <TagPanel rootStore={this.props.rootStore} />;
  }
  selectAllTags = () => {
    this.props.rootStore.uiStore.selectTags(this.props.rootStore.tagStore.tagList.toJS());
  }
  openTagRemover = () => {
    this.props.rootStore.uiStore.openOutlinerTagRemover();
  }
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
        <Hotkey
          combo={hotkeyMap.deleteSelection}
          label="Delete the selected tags and collections"
          onKeyDown={this.openTagRemover}
          group="Outliner"
        />
      </Hotkeys>
    );
  }
}

export { DragLayer };

export default withRootstore(TagPanelWithHotkeys);
