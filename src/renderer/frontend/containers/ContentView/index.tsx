import React from 'react';
import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';

import { IRootStoreProp, withRootstore } from '../../contexts/StoreContext';
import Gallery from './Gallery';
import Searchbar from './Searchbar';
import ContentToolbar from '../Toolbar/ContentToolbar';
import { Observer } from 'mobx-react-lite';
import { IS_PREVIEW_WINDOW } from 'src/renderer/renderer';

@HotkeysTarget
class ContentViewWithHotkeys extends React.PureComponent<IRootStoreProp> {
  render() {
    // const outlinerOpen = this.props.rootStore.uiStore.isOutlinerOpen === true ? 'outlineropen' : '';

    return (
      <main tabIndex={1}>
        <Observer>
          {() =>
            !IS_PREVIEW_WINDOW && this.props.rootStore.uiStore.isToolbarVertical ? (
                // <ContentToolbar className={`separated ${this.props.rootStore.uiStore.isOutlinerOpen ? '' : 'outlineropen'}`} /> frameless WIP
                <ContentToolbar className={`separated`} />
            ) : (
              <></>
            )
            }
        </Observer>
        <Searchbar />
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
