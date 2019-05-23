import { Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';
import * as React from 'react';
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
export class GlobalHotkeys extends React.PureComponent<IGlobalHotkeysProps & IRootStoreProp, {}> {
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

        {/* Toggle outliner tabs */}
        <Hotkey
          global={true}
          combo={hotkeyMap.openOutlinerImport}
          label="Opens the import tab in the outliner (left sidebar)"
          onKeyDown={uiStore.openOutlinerImport}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.openOutlinerTags}
          label="Opens the tag tab in the outliner (left sidebar)"
          onKeyDown={uiStore.openOutlinerTags}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.openOutlinerSearch}
          label="Opens the search tab in the outliner (left sidebar)"
          onKeyDown={uiStore.openOutlinerSearch}
          preventDefault
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.toggleSettings}
          label="Opens the settings tab in right sidebar"
          onKeyDown={uiStore.toggleSettings}
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
          combo={hotkeyMap.selectAllFiles}
          label="Select all files in the content area"
          onKeyDown={uiStore.selectAllFiles}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.deselectAllFiles}
          label="Deselect all files in the content area"
          onKeyDown={uiStore.deselectAllFiles}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.deleteSelectedFiles}
          label="Delete the selected files"
          // onKeyDown={uiStore.}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewList}
          label="Sets view to list mode"
          onKeyDown={uiStore.viewList}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewGrid}
          label="Sets view to Grid mode"
          onKeyDown={uiStore.viewGrid}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewMason}
          label="Sets view to mason mode"
          onKeyDown={uiStore.viewMason}
        />
        <Hotkey
          global={true}
          combo={hotkeyMap.viewSlide}
          label="Sets view to slide mode"
          onKeyDown={uiStore.viewSlide}
        />

        <Hotkey
          global={true}
          combo={hotkeyMap.openPreviewWindow}
          label="Opens a preview window for the selected files"
          onKeyDown={uiStore.openPreviewWindow}
        />
      </Hotkeys>
    );
  }
}

const GlobalHotkeysWrapper = observer((props: IGlobalHotkeysProps) => {
  const rootStore = React.useContext(StoreContext);
  return <GlobalHotkeys {...props} rootStore={rootStore} />;
});

export default GlobalHotkeysWrapper;
