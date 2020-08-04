import React from 'react';

import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { IRootStoreProp, withRootstore } from '../../../contexts/StoreContext';
import TagsTree from './TagsTree';

const TagsPanel = observer(({ rootStore }: IRootStoreProp) => {
  const { tagCollectionStore, tagStore, uiStore } = rootStore;

  return (
    <TagsTree
      root={tagCollectionStore.getRootCollection()}
      uiStore={uiStore}
      tagCollectionStore={tagCollectionStore}
      tagStore={tagStore}
    />
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
