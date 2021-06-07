import React, { useContext, useRef } from 'react';
import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';

import StoreContext from 'src/frontend/contexts/StoreContext';

const Searchbar = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const searchCriteriaList = uiStore.searchCriteriaList;

  // Only show quick search bar when all criteria are tags,
  // otherwise show a search bar that opens to the advanced search form
  // Exception: Searching for untagged files (tag contains empty value)
  // -> show as custom label in CriteriaList
  const isQuickSearch =
    searchCriteriaList.length === 0 ||
    searchCriteriaList.every(
      (crit) =>
        crit.key === 'tags' &&
        crit.operator === 'containsRecursively' &&
        (crit as ClientTagSearchCriteria<any>).value.length,
    );

  return <div className="searchbar">{isQuickSearch ? <QuickSearchList /> : <CriteriaList />}</div>;
});

export default Searchbar;

import {
  CustomKeyDict,
  ClientStringSearchCriteria,
  ClientTagSearchCriteria,
} from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';

import { IconButton, IconSet, Tag, Row } from 'widgets';

import { TagSelector } from 'src/frontend/components/TagSelector';
import { useAction } from 'src/frontend/hooks/useAction';

const QuickSearchList = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);

  const selection = useRef(
    computed(() => {
      const selectedItems: ClientTag[] = [];
      uiStore.searchCriteriaList.forEach((c) => {
        if (c instanceof ClientTagSearchCriteria && c.value.length === 1) {
          const item = tagStore.get(c.value[0]);
          if (item) {
            selectedItems.push(item);
          }
        }
      });
      return selectedItems;
    }),
  ).current;

  const handleSelect = useAction((item: Readonly<ClientTag>) =>
    uiStore.addSearchCriteria(new ClientTagSearchCriteria(tagStore, 'tags', item.id, item.name)),
  );

  const handleDeselect = useAction((item: Readonly<ClientTag>) => {
    const crit = uiStore.searchCriteriaList.find(
      (c) => c instanceof ClientTagSearchCriteria && c.value.includes(item.id),
    );
    if (crit) {
      uiStore.removeSearchCriteria(crit);
    }
  });

  const renderCreateOption = useRef(
    (query: string, resetTextBox: () => void, isFocused: (index: number) => boolean) => {
      return [
        <Row
          key="search-in-path"
          value={`Search in file paths for "${query}"`}
          onClick={() => {
            resetTextBox();
            uiStore.addSearchCriteria(
              new ClientStringSearchCriteria('absolutePath', query, undefined, CustomKeyDict),
            );
          }}
          focused={isFocused(0)}
        />,
        <Row
          key="advanced-search"
          value="Advanced search"
          onClick={uiStore.toggleAdvancedSearch}
          icon={IconSet.SEARCH_EXTENDED}
          focused={isFocused(1)}
        />,
      ];
    },
  ).current;

  return (
    <TagSelector
      multiselectable
      selection={selection.get()}
      onSelect={handleSelect}
      onDeselect={handleDeselect}
      onTagClick={uiStore.toggleAdvancedSearch}
      onClear={uiStore.clearSearchCriteriaList}
      renderCreateOption={renderCreateOption}
      extraIconButtons={<SearchMatchButton disabled={selection.get().length < 2} />}
    />
  );
});

const SearchMatchButton = observer(({ disabled }: { disabled: boolean }) => {
  const { fileStore, uiStore } = useContext(StoreContext);

  const handleClick = useRef(() => {
    uiStore.toggleSearchMatchAny();
    fileStore.refetch();
  }).current;

  return (
    <IconButton
      icon={uiStore.searchMatchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
      text={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
      onClick={handleClick}
      className="btn-icon-large"
      disabled={disabled}
    />
  );
});

const CriteriaList = observer(() => {
  const { fileStore, uiStore } = useContext(StoreContext);
  return (
    <div className="input" onClick={uiStore.toggleAdvancedSearch}>
      <div className="multiautocomplete-input">
        <div className="input-wrapper">
          {uiStore.searchCriteriaList.map((c, i) => (
            <Tag
              key={`${i}-${c.toString()}`}
              text={c.toString()}
              onRemove={() => uiStore.removeSearchCriteriaByIndex(i)}
              // Italicize system tags (for now only "Untagged images")
              className={
                c instanceof ClientTagSearchCriteria && c.isSystemTag() ? 'italic' : undefined
              }
            />
          ))}
        </div>

        {uiStore.searchCriteriaList.length > 1 ? (
          <IconButton
            icon={uiStore.searchMatchAny ? IconSet.SEARCH_ANY : IconSet.SEARCH_ALL}
            text={`Search using ${uiStore.searchMatchAny ? 'any' : 'all'} queries`}
            onClick={(e) => {
              uiStore.toggleSearchMatchAny();
              fileStore.refetch();
              e.stopPropagation();
              e.preventDefault();
            }}
            className="btn-icon-large"
          />
        ) : (
          <> </>
        )}

        <IconButton
          icon={IconSet.CLOSE}
          text="Clear"
          onClick={(e) => {
            uiStore.clearSearchCriteriaList();
            e.stopPropagation();
            e.preventDefault();
          }}
        />
      </div>
    </div>
  );
});
