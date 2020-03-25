import React from 'react';
import { observer } from 'mobx-react-lite';
import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';

import { IRootStoreProp, withRootstore } from '../../contexts/StoreContext';
import Gallery from './Gallery';
import Searchbar from './Searchbar';

const ContentView = observer(() => {
  return (
    <div className="gallery">
      <Searchbar />
      <Gallery />
    </div>
  );
});

@HotkeysTarget
class ContentViewWithHotkeys extends React.PureComponent<IRootStoreProp, {}> {
  render() {
    return (
      <main tabIndex={1}>
        <ContentView {...this.props} />
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
        {/* <Hotkey
          combo={hotkeyMap.deleteSelection}
          label="Delete the selected files"
          onKeyDown={uiStore.toggleToolbarFileRemover}
          group="Gallery"
        /> */}
        <Hotkey
          combo={hotkeyMap.closeSearch}
          label="Close search bar"
          onKeyDown={uiStore.closeQuickSearch}
          group="Gallery"
        />
      </Hotkeys>
    );
  }
}

export default withRootstore(ContentViewWithHotkeys);
