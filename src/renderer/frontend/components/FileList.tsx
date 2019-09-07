import React, { useCallback, useContext, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Hotkey, Hotkeys, HotkeysTarget, TagInput } from '@blueprintjs/core';

import StoreContext, { IRootStoreProp } from '../contexts/StoreContext';
import Gallery from './Gallery';
import { ClientTag } from '../../entities/Tag';
import MultiTagSelector from './MultiTagSelector';
import { KeyLabelMap } from './SearchForm';
import { IArraySearchCriteria } from '../../entities/SearchCriteria';
import { IFile } from '../../entities/File';

const QuickSearchList = observer(() => {
  const { uiStore, tagStore, fileStore } = useContext(StoreContext);

  const tagCrit = uiStore.searchCriteriaList[0] as IArraySearchCriteria<IFile>;

  const queriedTags = useMemo(
    () => tagCrit.value.map((id) => tagStore.tagList.find((t) => t.id === id) as ClientTag),
    [tagCrit.value.length]);

  const handleSelectTag = useCallback((tag: ClientTag) => {
    tagCrit.value.push(tag.id);
    uiStore.searchByQuery();
  }, []);

  const handleDeselectTag = useCallback((tag: ClientTag) => {
    const index = tagCrit.value.indexOf(tag.id);
    if (index >= 0) {
      tagCrit.value.splice(index, 1);
      uiStore.searchByQuery();
    }
  }, []);

  const handleClearTags = useCallback(() => {
    uiStore.toggleQuickSearch();
    fileStore.fetchAllFiles();
  }, []);

  return (
    <MultiTagSelector
      selectedTags={queriedTags}
      onTagSelect={handleSelectTag}
      onTagDeselect={handleDeselectTag}
      onClearSelection={handleClearTags}
      autoFocus
      tagIntent="primary"
      // refocusObject={quickSearchFocusDate}
    />
  );
});

const CriteriaList = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const ClearButton = useMemo(() => <Button onClick={uiStore.clearSearchQueryList} icon="cross" />, []);
  const handleRemove = useCallback((_: string, index: number) =>
    uiStore.removeSearchQuery(uiStore.searchCriteriaList[index]), []);

  const preventTyping = useCallback((e: React.KeyboardEvent<HTMLElement>, i?: number) => {
    // If it's not an event on an existing Tag element, ignore it
    if (i === undefined && !e.ctrlKey) {
      e.preventDefault();
    }
  }, []);

  const handleTagClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (e.currentTarget.tagName === 'SPAN') {
      uiStore.toggleAdvancedSearch();
    }
  }, []);

  return (
    <TagInput
      values={uiStore.searchCriteriaList.map((crit, i) => `${i + 1}: ${KeyLabelMap[crit.key]}`)}
      rightElement={ClearButton}
      onRemove={handleRemove}
      inputProps={{ disabled: true }}
      onKeyDown={preventTyping}
      tagProps={{ minimal: true, intent: 'primary', onClick: handleTagClick, interactive: true }}
      fill
    />
  );
});

const SearchBar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const showQuickSearch = uiStore.searchCriteriaList.length === 1 && uiStore.searchCriteriaList[0].key === 'tags';

  return (
    <div id="quick-search">
      <Button icon="more" onClick={uiStore.toggleAdvancedSearch} />
      {showQuickSearch ? <QuickSearchList /> : <CriteriaList /> }
    </div>
  );
});

const FileList = observer(({ rootStore: { uiStore } }: IRootStoreProp) => {
  return (
    <>
      { uiStore.isQuickSearchOpen && <SearchBar /> }
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
