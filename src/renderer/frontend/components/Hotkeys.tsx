import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';
import React, { useContext } from 'react';
import StoreContext, { IRootStoreProp } from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';

interface IGlobalHotkeysProps {
  children?: JSX.Element | JSX.Element[];
}

/**
 * This contains all global hotkeys.
 * At the moment also some non-global ones, those should probably be moved
 * to the corresponding components. Those need a 'groups' property
 */
@HotkeysTarget
export class GlobalHotkeys extends React.PureComponent<IGlobalHotkeysProps & IRootStoreProp> {
  render() {
    return <>{this.props.children}</>;
  }

  renderHotkeys() {
    const { uiStore } = this.props.rootStore;
    const { hotkeyMap } = uiStore;
    return (
      <Hotkeys>
        {/* Toggle main UI components */}
        <Hotkey
          global={true}
          combo={hotkeyMap.toggleOutliner}
          label="Toggles the outliner (left sidebar)"
          onKeyDown={uiStore.toggleOutliner}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.toggleInspector}
          label="Toggles the inspector (right sidebar)"
          onKeyDown={uiStore.toggleInspector}
        />

        <Hotkey
          global={true}
          combo={hotkeyMap.toggleSettings}
          label="Opens the settings tab in right sidebar"
          onKeyDown={uiStore.toggleSettings}
          preventDefault
        />

        <Hotkey
          global={true}
          combo={hotkeyMap.toggleHelpCenter}
          label="Opens the helpcenter tab in right sidebar"
          onKeyDown={uiStore.toggleHelpCenter}
          preventDefault
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.replaceQuery}
          label="Replaces the search query with the selected tags"
          onKeyDown={uiStore.replaceCriteriaWithTagSelection}
          preventDefault
        />

        {/* Toolbar actions */}
        <Hotkey
          global={true}
          combo={hotkeyMap.openTagSelector}
          label="Opens the tag selector (toolbar)"
          onKeyDown={uiStore.toggleToolbarTagSelector}
          preventDefault
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewList}
          label="Sets view to list mode"
          onKeyDown={uiStore.setMethodList}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewGrid}
          label="Sets view to grid mode"
          onKeyDown={uiStore.setMethodGrid}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewSlide}
          label="Sets view to slide mode"
          onKeyDown={uiStore.toggleSlideMode}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.quickSearch}
          label="Toggle quick search"
          onKeyDown={uiStore.toggleQuickSearch}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.advancedSearch}
          label="Toggle advanced search"
          onKeyDown={uiStore.toggleAdvancedSearch}
        />

        <Hotkey
          global={true}
          combo={hotkeyMap.openPreviewWindow}
          label="Opens a preview window for the selected files"
          onKeyDown={uiStore.openPreviewWindow}
        />
        {/* How about other keys like arrow keys for selecting items */}
      </Hotkeys>
    );
  }
}

const GlobalHotkeysWrapper = observer((props: IGlobalHotkeysProps) => {
  const rootStore = useContext(StoreContext);
  return <GlobalHotkeys {...props} rootStore={rootStore} />;
});

export default GlobalHotkeysWrapper;
