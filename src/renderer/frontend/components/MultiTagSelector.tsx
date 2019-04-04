import React, { useContext, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import { Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, MultiSelect, ItemPredicate } from '@blueprintjs/select';

import { ClientTag } from '../../entities/Tag';
import StoreContext from '../contexts/StoreContext';

const TagMultiSelect = MultiSelect.ofType<ClientTag>();

const NoResults = <MenuItem disabled={true} text="No results." />;

const CREATED_TAG_ID = 'created-tag-id';

const renderCreateTagOption = (
  query: string,
  active: boolean,
  handleClick: React.MouseEventHandler<HTMLElement>,
) => (
  <MenuItem
    icon="add"
    text={`Create "${query}"`}
    active={active}
    onClick={handleClick}
    shouldDismissPopover={false}
  />
);

const filterTag: ItemPredicate<ClientTag> = (query, tag, index, exactMatch) => {
  const normalizedName = tag.name.toLowerCase();
  const normalizedQuery = query.toLowerCase();

  if (exactMatch) {
    return normalizedName === normalizedQuery;
  } else {
    return normalizedName.indexOf(normalizedQuery) >= 0;
  }
};

interface IMultiTagSelectorProps {
  selectedTags: ClientTag[];
  tagLabel?: (tag: ClientTag) => string;
  onTagSelect: (tag: ClientTag) => void;
  onTagDeselect: (index: number) => void;
  onClearSelection: () => void;
  onTagCreation?: (name: string) => ClientTag;
}

const MultiTagSelector = ({
  selectedTags,
  tagLabel,
  onTagSelect,
  onTagDeselect,
  onClearSelection,
  onTagCreation,
}: IMultiTagSelectorProps) => {
  const { tagStore } = useContext(StoreContext);

  const handleSelect = useCallback(
    (tag: ClientTag) => {
      // When a tag is created, it is selected. Here we detect whether we need to actually the ClientTag.
      if (onTagCreation && tag.id === CREATED_TAG_ID) {
        tag = onTagCreation(tag.name);
      }

      return selectedTags.includes(tag)
        ? onTagDeselect(selectedTags.indexOf(tag))
        : onTagSelect(tag);
    },
    [selectedTags],
  );

  const handleDeselect = useCallback(
    (_: string, index: number) => onTagDeselect(index),
    [onTagDeselect],
  );

  // Todo: Might need a confirmation pop over
  const ClearButton = useMemo(
    () =>
      selectedTags.length > 0 ? (
        <Button icon="cross" minimal={true} onClick={onClearSelection} />
      ) : (
        undefined
      ),
    [selectedTags],
  );

  const SearchTagItem = useCallback<ItemRenderer<ClientTag>>(
    (tag, { modifiers, handleClick }) => {
      if (!modifiers.matchesPredicate) {
        return null;
      }
      return (
        <MenuItem
          active={modifiers.active}
          icon={selectedTags.includes(tag) ? 'tick' : 'blank'}
          key={tag.id}
          label={tag.description ? tag.description.toString() : ''}
          onClick={handleClick}
          text={`${tag.name}`}
          shouldDismissPopover={false}
        />
      );
    },
    [selectedTags],
  );

  const TagLabel = (tag: ClientTag) => (tagLabel ? tagLabel(tag) : tag.name);

  // Only used for visualization in the selector, an actual ClientTag is created onSelect
  const createNewTag = useCallback(
    (name: string) => new ClientTag(tagStore, name, CREATED_TAG_ID),
    [],
  );

  const maybeCreateNewItemFromQuery = onTagCreation ? createNewTag : undefined;
  const maybeCreateNewItemRenderer = onTagCreation
    ? renderCreateTagOption
    : undefined;

  return (
    <>
      <TagMultiSelect
        items={tagStore.tagList}
        selectedItems={selectedTags}
        itemRenderer={SearchTagItem}
        noResults={NoResults}
        onItemSelect={handleSelect}
        popoverProps={{ minimal: true }}
        tagRenderer={TagLabel}
        createNewItemFromQuery={maybeCreateNewItemFromQuery}
        createNewItemRenderer={maybeCreateNewItemRenderer}
        itemPredicate={filterTag}
        tagInputProps={{
          tagProps: { minimal: true },
          onRemove: handleDeselect,
          rightElement: ClearButton,
          fill: true,
        }}
      />
    </>
  );
};

export default observer(MultiTagSelector);
