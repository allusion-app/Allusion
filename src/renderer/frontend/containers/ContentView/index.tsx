import React, { useCallback, useContext, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Hotkey, Hotkeys, HotkeysTarget, TagInput } from '@blueprintjs/core';
import { CSSTransition } from 'react-transition-group';

import StoreContext, { IRootStoreProp, withRootstore } from '../../contexts/StoreContext';
import Gallery from './Gallery';
import IconSet from '../../components/Icons';
import { ClientTag } from '../../../entities/Tag';
import { IArraySearchCriteria } from '../../../entities/SearchCriteria';
import { IFile } from '../../../entities/File';
import MultiTagSelector from '../../components/MultiTagSelector';
import { KeyLabelMap } from '../Outliner/SearchForm';

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

  const handleCloseSearch = useCallback((e: React.KeyboardEvent) => {
    if (e.key.toLowerCase() === uiStore.hotkeyMap.closeSearch) {
      e.preventDefault();
      // Prevent react update on unmounted component while searchbar is closing
      setTimeout(uiStore.closeSearch, 0);
    }
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
      onKeyDown={handleCloseSearch}
      showClearButton={false}
    />
  );
});

const CriteriaList = observer(() => {
  const { uiStore } = useContext(StoreContext);

  // const ClearButton = useMemo(() => <Button onClick={uiStore.clearSearchQueryList} icon="cross" />, []);
  const handleRemove = useCallback((_: string, index: number) =>
    uiStore.removeSearchQuery(uiStore.searchCriteriaList[index]), []);

  const preventTyping = useCallback((e: React.KeyboardEvent<HTMLElement>, i?: number) => {
    // If it's not an event on an existing Tag element, ignore it
    if (i === undefined && !e.ctrlKey) {
      e.preventDefault();
    }
  }, []);

  const handleTagClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'SPAN') {
      uiStore.toggleAdvancedSearch();
    }
  }, []);

  return (
    <div id="criteria-list">
      <TagInput
        values={uiStore.searchCriteriaList.map((crit, i) => `${i + 1}: ${KeyLabelMap[crit.key]}`)}
        // rightElement={ClearButton}
        onRemove={handleRemove}
        inputProps={{ disabled: true }}
        onKeyDown={preventTyping}
        tagProps={{ minimal: true, intent: 'primary', onClick: handleTagClick, interactive: true }}
        fill
      />
    </div>
  );
});

const SearchBar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const showQuickSearch = uiStore.searchCriteriaList.length === 1 && uiStore.searchCriteriaList[0].key === 'tags';

  return (
    <CSSTransition in={uiStore.isQuickSearchOpen} classNames="quick-search" timeout={200} unmountOnExit>
      <div className="quick-search">
        <Button minimal icon={IconSet.SEARCH_EXTENDED} onClick={uiStore.toggleAdvancedSearch} title="Advanced search" />
        {showQuickSearch ? <QuickSearchList /> : <CriteriaList /> }
        <Button minimal icon={IconSet.CLOSE} onClick={uiStore.toggleQuickSearch} title="Close (Escape)" />
      </div>
    </CSSTransition>
  );
});

const ContentView = observer(({ rootStore: { uiStore } }: IRootStoreProp) => {
  return (
    <>
      <SearchBar />
      <Gallery />
    </>
  );
});

@HotkeysTarget
class ContentViewWithHotkeys extends React.PureComponent<IRootStoreProp, {}> {
  render() {
    return (
      <main tabIndex={1} className="gallery">
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
          onKeyDown={uiStore.deselectAllFiles}
          group="Gallery"
        />
        <Hotkey
          combo={hotkeyMap.deleteSelection}
          label="Delete the selected files"
          onKeyDown={uiStore.toggleToolbarFileRemover}
          group="Gallery"
        />
        <Hotkey
          combo={hotkeyMap.closeSearch}
          label="Close search bar"
          onKeyDown={uiStore.closeSearch}
          group="Gallery"
        />
      </Hotkeys>
    );
  }
}

export default withRootstore(ContentViewWithHotkeys);
