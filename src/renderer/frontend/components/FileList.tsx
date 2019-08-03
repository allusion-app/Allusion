import React, { useCallback, useContext, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Hotkey, Hotkeys, HotkeysTarget } from '@blueprintjs/core';

import StoreContext, { IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import { ClientTag } from '../../entities/Tag';
import MultiTagSelector from './MultiTagSelector';

const QuickSearch = observer(() => {
  const { uiStore, tagStore, fileStore } = useContext(StoreContext);

  // Todo: Implement this properly later
  const queriedTags = useMemo(
    () => uiStore.quickSearchTags.map((id) => tagStore.tagList.find((t) => t.id === id) as ClientTag),
    [uiStore.quickSearchTags.length]);

  const handleSelectTag = useCallback((tag: ClientTag) => {
    uiStore.quickSearchTags.push(tag.id);
    fileStore.fetchFilesByTagIDs(uiStore.quickSearchTags);
  }, []);

  const handleDeselectTag = useCallback((tag: ClientTag) => {
    uiStore.quickSearchTags.remove(tag.id);
    fileStore.fetchFilesByTagIDs(uiStore.quickSearchTags);
  }, []);

  const handleClearTags = useCallback(() => {
    uiStore.isQuickSearchOpen = false;
    uiStore.quickSearchTags.clear();
    fileStore.fetchAllFiles();
  }, []);

  return (
    <div id="quick-search">
      <Button icon="more" />
      <MultiTagSelector
        selectedTags={queriedTags}
        onTagSelect={handleSelectTag}
        onTagDeselect={handleDeselectTag}
        onClearSelection={handleClearTags}
        autoFocus
        tagIntent="primary"
      />
    </div>
  );
});

const FileList = observer(({ rootStore: { uiStore } }: IRootStoreProp) => {
  return (
    <>
      { uiStore.isQuickSearchOpen && <QuickSearch /> }
      <Gallery />
    </>
  );
});

@HotkeysTarget
class FileListWithHotkeys extends React.PureComponent<IRootStoreProp, {}> {
  render() {
    return <div tabIndex={1} className="gallery"><FileList {...this.props} /></div>;
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
          onKeyDown={uiStore.deselectAllFiles}
          group="Gallery"
        />
        <Hotkey
          combo={hotkeyMap.deleteSelection}
          label="Delete the selected files"
          onKeyDown={uiStore.toggleToolbarFileRemover}
          group="Gallery"
        />
      </Hotkeys>
    );
  }
}

const HotkeysWrapper = observer(() => {
  const rootStore = React.useContext(StoreContext);
  return <FileListWithHotkeys rootStore={rootStore} />;
});

export default HotkeysWrapper;
