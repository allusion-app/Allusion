import React, { useContext, useMemo, useCallback, useRef, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import { Button, MenuItem, TagInput } from '@blueprintjs/core';
import { ItemRenderer, MultiSelect, ItemPredicate } from '@blueprintjs/select';

import { ClientTag } from '../../entities/Tag';
import StoreContext from '../contexts/StoreContext';
import IconSet from './Icons';

const TagMultiSelect = MultiSelect.ofType<ClientTag>();

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
  onTagDeselect: (tag: ClientTag, index: number) => void;
  onClearSelection: () => void;
  onTagCreation?: (name: string) => Promise<ClientTag>;
  placeholder?: string;
  disabled?: boolean;
  /** Focus on mount */
  autoFocus?: boolean;
  /** When this object changes, autoFocus is triggered (since this component does not remount often itself) */
  refocusObject?: any;
}

const MultiTagSelector = ({
  selectedTags,
  tagLabel,
  onTagSelect,
  onTagDeselect,
  onClearSelection,
  onTagCreation,
  placeholder,
  disabled,
  autoFocus,
  refocusObject,
}: IMultiTagSelectorProps) => {
  const { tagStore } = useContext(StoreContext);

  const handleSelect = useCallback(
    async (tag: ClientTag) => {
      // When a tag is created, it is selected. Here we detect whether we need to actually create the ClientTag.
      if (onTagCreation && tag.id === CREATED_TAG_ID) {
        tag = await onTagCreation(tag.name);
      }

      return selectedTags.includes(tag)
        ? onTagDeselect(tag, selectedTags.indexOf(tag))
        : onTagSelect(tag);
    },
    [selectedTags],
  );

  const handleDeselect = useCallback(
    (_: string, index: number) => onTagDeselect(selectedTags[index], index),
    [selectedTags],
  );

  // Todo: Might need a confirmation pop over
  const ClearButton = useMemo(
    () =>
      selectedTags.length > 0 ? (
        <Button icon={IconSet.CLOSE} minimal={true} onClick={onClearSelection} />
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

  const ref = useRef<TagInput>(null);

  useEffect(() => {
    if (autoFocus && ref.current) {
      // @ts-ignore inputElement is actually private, but the autoFocus of the tagInputProps is not working, so...
      const inputRef = ref.current.inputElement;
      if (inputRef) {
        inputRef.focus();
      }
    }
  }, [refocusObject]);

  return (
    <>
      <TagMultiSelect
        items={tagStore.tagList}
        selectedItems={selectedTags}
        itemRenderer={SearchTagItem}
        noResults={NoResults}
        onItemSelect={handleSelect}
        popoverProps={{ minimal: true }}
        openOnKeyDown={false}
        tagRenderer={TagLabel}
        createNewItemFromQuery={maybeCreateNewItemFromQuery}
        createNewItemRenderer={maybeCreateNewItemRenderer}
        itemPredicate={filterTag}
        tagInputProps={{
          tagProps: { minimal: true },
          onRemove: handleDeselect,
          rightElement: ClearButton,
          fill: true,
          // @ts-ignore inputElement is actually private, but the autoFocus of the tagInputProps is not working, so...
          inputRef: ref.current ? ref.current.inputELement : null,
          disabled,
        }}
        placeholder={placeholder}
        resetOnSelect
      />
    </>
  );
};

export default observer(MultiTagSelector);
