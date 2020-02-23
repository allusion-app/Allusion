import React, { useCallback, useContext } from 'react';
import { observer } from 'mobx-react-lite';
import { Button, Hotkey, Hotkeys, HotkeysTarget, TagInput } from '@blueprintjs/core';
import { CSSTransition } from 'react-transition-group';

import StoreContext, { IRootStoreProp, withRootstore } from '../../contexts/StoreContext';
import Gallery from './Gallery';
import IconSet from '../../components/Icons';
import { ClientTag } from '../../../entities/Tag';
import { ClientIDSearchCriteria, ClientCollectionSearchCriteria } from '../../../entities/SearchCriteria';
import MultiTagSelector from '../../components/MultiTagSelector';
import { ClientTagCollection } from '../../../entities/TagCollection';

const QuickSearchList = observer(() => {
  const { uiStore, tagStore, tagCollectionStore } = useContext(StoreContext);

  const selectedItems: (ClientTag | ClientTagCollection)[] = [];
  uiStore.searchCriteriaList.forEach((c) => {
    if (c instanceof ClientIDSearchCriteria) {
      const tag = tagStore.get(c.value.length === 1 ? c.value[0] : '');
      if (tag) selectedItems.push(tag);
    } else if (c instanceof ClientCollectionSearchCriteria) {
      const col = tagCollectionStore.get(c.collectionId);
      if (col) selectedItems.push(col);
    }
  });

  const handleSelectTag = useCallback((tag: ClientTag) => {
    uiStore.addSearchCriteria(new ClientIDSearchCriteria('tags', tag.id, tag.name));
    uiStore.searchByQuery();
  }, [uiStore]);
  const handleSelectCol = useCallback((col: ClientTagCollection) => {
    uiStore.addSearchCriteria(new ClientCollectionSearchCriteria(col.id, col.getTagsRecursively(), col.name));
    uiStore.searchByQuery();
  }, [uiStore]);

  const handleDeselectTag = useCallback((tag: ClientTag) => {
    const crit = uiStore.searchCriteriaList.find((c) => c instanceof ClientIDSearchCriteria && c.value.includes(tag.id));
    if (crit) {
      uiStore.removeSearchCriteria(crit);
      uiStore.searchByQuery();
    }
  }, [uiStore]);
  const handleDeselectCol = useCallback((col: ClientTagCollection) => {
    const crit = uiStore.searchCriteriaList.find((c) => c instanceof ClientCollectionSearchCriteria && c.collectionId === col.id);
    if (crit) {
      uiStore.removeSearchCriteria(crit);
      uiStore.searchByQuery();
    }
  }, [uiStore]);

  const handleClear = useCallback(() => {
    uiStore.clearSearchCriteriaList();
    uiStore.searchByQuery();
  }, [ uiStore]);

  const handleCloseSearch = useCallback((e: React.KeyboardEvent) => {
    if (e.key.toLowerCase() === uiStore.hotkeyMap.closeSearch) {
      e.preventDefault();
      // Prevent react update on unmounted component while searchbar is closing
      setTimeout(uiStore.closeSearch, 0);
    }
  }, [uiStore.closeSearch, uiStore.hotkeyMap.closeSearch]);

  return (
    <MultiTagSelector
      selectedItems={selectedItems}
      onTagSelect={handleSelectTag}
      onTagDeselect={handleDeselectTag}
      onClearSelection={handleClear}
      autoFocus
      tagIntent="primary"
      onKeyDown={handleCloseSearch}
      showClearButton={false}
      includeCollections
      onTagColDeselect={handleDeselectCol}
      onTagColSelect={handleSelectCol}
    />
  );
});

const CriteriaList = observer(() => {
  const { uiStore } = useContext(StoreContext);

  const handleRemove = useCallback((_: string, index: number) => {
    uiStore.removeSearchCriteriaByIndex(index);
    uiStore.searchByQuery();
  }, [uiStore]);

  const preventTyping = useCallback((e: React.KeyboardEvent<HTMLElement>, i?: number) => {
    // If it's not an event on an existing Tag element, ignore it
    if (i === undefined && !e.ctrlKey) {
      e.preventDefault();
    }
  }, []);

  // Open advanced search when clicking one of the criteria (but not their delete buttons)
  const handleTagClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if ((e.target as HTMLElement).tagName === 'SPAN') {
      uiStore.toggleAdvancedSearch();
    }
  }, [uiStore]);

  // Open advanced search when clicking the Input element (background)
  const handleInputClick = useCallback(() => uiStore.toggleAdvancedSearch(), [uiStore]);

  return (
    <div id="criteria-list">
      <TagInput
        // values={uiStore.searchCriteriaList.map((crit, i) => `${i + 1}: ${KeyLabelMap[crit.key]}`)}
        values={uiStore.searchCriteriaList.map((crit) => `${crit.toString()}`)}
        // rightElement={ClearButton}
        onRemove={handleRemove}
        inputProps={{ disabled: true, onMouseUp: handleInputClick }}
        onKeyDown={preventTyping}
        tagProps={{ minimal: true, intent: 'primary', onClick: handleTagClick, interactive: true }}
        fill
      />
    </div>
  );
});

const SearchBar = observer(() => {
  const { uiStore } = useContext(StoreContext);

  // Only show quick search bar when all criteria are tags or collections, else show a search bar that opens to the advanced search form
  const showQuickSearch = uiStore.searchCriteriaList.length === 0 || uiStore.searchCriteriaList.every((crit) => crit.key === 'tags');

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

const ContentView = observer(() => {
  return (
    <div className="gallery">
      <SearchBar />
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
