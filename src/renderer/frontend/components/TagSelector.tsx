import React, { MutableRefObject, useCallback, useContext, useEffect, useRef } from 'react';
import { Icon, Intent, MenuItem } from '@blueprintjs/core';
import { ItemPredicate, ItemRenderer, Suggest } from '@blueprintjs/select';
import { observer } from 'mobx-react-lite';

import { ClientTag } from 'src/renderer/entities/Tag';
import { ClientTagCollection } from 'src/renderer/entities/TagCollection';
import StoreContext from '../contexts/StoreContext';
import IconSet from 'components/Icons';

const TagSelect = Suggest.ofType<ClientTag | ClientTagCollection>();

const NoResults = <MenuItem disabled={true} text="No results." />;

const CREATED_TAG_ID = 'created-tag-id';

const renderCreateTagOption = (
  query: string,
  active: boolean,
  handleClick: React.MouseEventHandler<HTMLElement>,
) => (
  <MenuItem
    icon={IconSet.ADD_TAG_FILL}
    text={`Create "${query}"`}
    active={active}
    onClick={handleClick}
    shouldDismissPopover={false}
  />
);

const filterTag: ItemPredicate<ClientTag | ClientTagCollection> = (
  query,
  tag,
  _index,
  exactMatch,
) => {
  const normalizedName = tag.name.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedName === normalizedQuery;
  } else {
    return normalizedName.indexOf(normalizedQuery) >= 0;
  }
};

interface ITagSelectorProps {
  selectedItem: ClientTag | ClientTagCollection | undefined | null;
  tagLabel?: (tag: ClientTag | ClientTagCollection) => string;
  onTagSelect: (tag: ClientTag) => void;
  onTagCreation?: (name: string) => Promise<ClientTag>;
  /** Focus on mount */
  autoFocus?: boolean;
  /** When this object changes, autoFocus is triggered (since this component does not remount often itself) */
  refocusObject?: any;
  tagIntent?: Intent;
  includeCollections?: boolean;
  onTagColSelect?: (tag: ClientTagCollection) => void;
}

const TagSelector = ({
  selectedItem,
  tagLabel,
  onTagSelect,
  onTagCreation,
  autoFocus,
  refocusObject,
  includeCollections,
  onTagColSelect,
}: ITagSelectorProps) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);

  const handleSelect = useCallback(
    async (tag: ClientTag | ClientTagCollection) => {
      // When a tag is created, it is selected. Here we detect whether we need to actually create the ClientTag.
      if (onTagCreation && tag.id === CREATED_TAG_ID) {
        tag = await onTagCreation(tag.name);
      }

      if (tag instanceof ClientTag) {
        onTagSelect(tag);
      } else if (onTagColSelect) {
        onTagColSelect(tag);
      }
    },
    [onTagColSelect, onTagCreation, onTagSelect],
  );

  const SearchTagItem = useCallback<ItemRenderer<ClientTag | ClientTagCollection>>(
    (tag, { modifiers, handleClick }) => {
      if (!modifiers.matchesPredicate) {
        return null;
      }
      const isSelected = selectedItem === tag;
      const isCol = tag instanceof ClientTagCollection;

      const rightIcon = isCol ? (
        <Icon icon={IconSet.TAG_GROUP} iconSize={12} color={tag.viewColor} />
      ) : tag.viewColor ? (
        <Icon icon="full-circle" iconSize={12} color={tag.viewColor} />
      ) : undefined;
      return (
        <MenuItem
          active={modifiers.active}
          icon={isSelected ? 'tick' : 'blank'}
          labelElement={rightIcon}
          key={tag.id}
          label={tag.description ? tag.description.toString() : ''}
          onClick={handleClick}
          text={`${tag.name}`}
          shouldDismissPopover={false}
        />
      );
    },
    [selectedItem],
  );

  const TagLabel = (tag: ClientTag | ClientTagCollection) => {
    if (!tag) {
      return '???';
    }
    return tagLabel ? tagLabel(tag) : tag.name;
  };

  // Only used for visualization in the selector, an actual ClientTag is created onSelect
  const createNewTag = useCallback(
    (name: string) => new ClientTag(tagStore, name, CREATED_TAG_ID),
    [tagStore],
  );

  const maybeCreateNewItemFromQuery = onTagCreation ? createNewTag : undefined;
  const maybeCreateNewItemRenderer = onTagCreation ? renderCreateTagOption : undefined;

  // Focus on the input element with an Effect whe the focusObject changes and autoFocus is requested
  const inputRef = useRef<HTMLInputElement>(null) as MutableRefObject<HTMLInputElement | null>;
  const setRef = useCallback(
    (ref: HTMLInputElement | null) => {
      inputRef.current = ref;
    },
    [inputRef],
  );

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [refocusObject, autoFocus, inputRef]);

  const items = includeCollections
    ? [...tagStore.tagList, ...tagCollectionStore.tagCollectionList]
    : tagStore.tagList;

  return (
    <TagSelect
      items={items}
      selectedItem={selectedItem}
      itemRenderer={SearchTagItem}
      noResults={NoResults}
      onItemSelect={handleSelect}
      popoverProps={{ minimal: true }}
      openOnKeyDown={true} // don't show the select list until you start typing
      inputValueRenderer={TagLabel}
      createNewItemFromQuery={maybeCreateNewItemFromQuery}
      createNewItemRenderer={maybeCreateNewItemRenderer}
      itemPredicate={filterTag}
      resetOnSelect={true}
      inputProps={{
        autoFocus,
        // add a ref to the input so we can re-focus when needed
        inputRef: setRef,
      }}
    />
  );
};

export default observer(TagSelector);
