import React from 'react';

import { Button, MenuItem } from '@blueprintjs/core';
import { ItemRenderer, MultiSelect } from '@blueprintjs/select';

import { ClientTag } from '../../entities/Tag';

const TagMultiSelect = MultiSelect.ofType<ClientTag>();

const SearchTagItem: ItemRenderer<ClientTag> = (tag, { modifiers, handleClick }) => {
  if (!modifiers.matchesPredicate) {
    return null;
  }
  return (
    <MenuItem
      active={modifiers.active}
      // icon={this.isFilmSelected(tag) ? "tick" : "blank"}
      key={tag.id}
      label={tag.description.toString()}
      onClick={handleClick}
      text={`${tag.name}`}
      shouldDismissPopover={false}
    />
  );
};

interface ISearchBarProps {
  onTagSelect: (tag: ClientTag) => void;
  onTagDeselect: (index: number) => void;
  onClearSelection: () => void;
  selectedTags: ClientTag[];
  allTags: ClientTag[];
}
const SearchBar = ({
  onTagSelect,
  onTagDeselect,
  onClearSelection,
  selectedTags,
  allTags,
}: ISearchBarProps) => {

  const handleDelect = (_: string, index: number) => onTagDeselect(index);

  const clearButton = selectedTags.length > 0 ? (
    <Button icon="cross" minimal={true} onClick={onClearSelection} />
  ) : null;

  return (
    <>
      <TagMultiSelect
        items={allTags}
        selectedItems={selectedTags}
        initialContent={undefined}
        itemRenderer={SearchTagItem}
        noResults={<MenuItem disabled={true} text="No results." />}
        onItemSelect={onTagSelect}
        popoverProps={{ minimal: true }}
        tagRenderer={(tag) => tag.name}
        tagInputProps={{ tagProps: { minimal: true }, onRemove: handleDelect, rightElement: clearButton }}
      />
    </>
  );
};

export default SearchBar;
