import React from 'react';
import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';

import { IRootStoreProp, withRootstore } from '../../contexts/StoreContext';
import Gallery from './Gallery';

@HotkeysTarget
class ContentViewWithHotkeys extends React.PureComponent<IRootStoreProp> {
  render() {
    return (
      <main>
        <Gallery />
      </main>
    );
  }
  renderHotkeys() {
    const { uiStore } = this.props.rootStore;
    const { hotkeyMap } = uiStore;
    return (
      <Hotkeys>
        <Hotkey
          combo={hotkeyMap.selectAll}
          label="Select all files in the content area"
          onKeyDown={uiStore.selectAllFiles}
          group="Gallery"
        />
        <Hotkey
          combo={hotkeyMap.deselectAll}
          label="Deselect all files in the content area"
          onKeyDown={uiStore.clearFileSelection}
          group="Gallery"
        />
      </Hotkeys>
    );
  }
}

export default withRootstore(ContentViewWithHotkeys);
