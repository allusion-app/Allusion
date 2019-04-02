import React, { useContext, useMemo, useCallback } from 'react';
import { observer } from 'mobx-react-lite';

import { Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, MultiSelect } from '@blueprintjs/select';

import { ClientTag } from '../../entities/Tag';
import StoreContext from '../contexts/StoreContext';

const TagMultiSelect = MultiSelect.ofType<ClientTag>();

const NoResults = <MenuItem disabled={true} text="No results." />;

interface IMultiTagSelectorProps {
  selectedTags: ClientTag[];
  tagLabel?: (tag: ClientTag) => string;
  onTagSelect: (tag: ClientTag) => void;
  onTagDeselect: (index: number) => void;
  onClearSelection: () => void;
}

const MultiTagSelector = ({
  selectedTags,
  tagLabel,
  onTagSelect,
  onTagDeselect,
  onClearSelection,

}: IMultiTagSelectorProps) => {
  const { tagStore } = useContext(StoreContext);

  const handleSelect = useCallback(
    (tag: ClientTag) => (selectedTags.includes(tag)
      ? onTagDeselect(selectedTags.indexOf(tag))
      : onTagSelect(tag)
    ),
    [selectedTags],
  );

  const handleDeselect = useCallback((_: string, index: number) => onTagDeselect(index), []);

  // Todo: Might need a confirmation pop over
  const ClearButton = useMemo(() =>
    selectedTags.length > 0 ? (
      <Button icon="cross" minimal={true} onClick={onClearSelection} />
    ) : (
      undefined
    ),
    [selectedTags],
  );

  const SearchTagItem = useMemo(
    (): ItemRenderer<ClientTag> => (
      tag,
      { modifiers, handleClick },
    ) => {
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

  const TagLabel = (tag: ClientTag) => tagLabel ? tagLabel(tag) : tag.name;

  return (
    <>
      <TagMultiSelect
        items={tagStore.tagList}
        selectedItems={selectedTags}
        initialContent={undefined}
        itemRenderer={SearchTagItem}
        noResults={NoResults}
        onItemSelect={handleSelect}
        popoverProps={{ minimal: true }}
        tagRenderer={TagLabel}
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
