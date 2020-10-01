import React, { useContext, useState, useMemo } from 'react';
import { observer } from 'mobx-react-lite';
import StoreContext from 'src/renderer/frontend/contexts/StoreContext';
import { ClientTag } from 'src/renderer/entities/Tag';
import { ClientTagCollection, ROOT_TAG_COLLECTION_ID } from 'src/renderer/entities/TagCollection';
import { Listbox, Option } from 'components';
import { Flyout } from 'components/popover';

type TagItem = ClientTag | ClientTagCollection;

interface ITagSelector {
  selection: TagItem | undefined;
  onSelect: (item: TagItem) => void;
}

/**
 * Selects an item from all currently available tags and tag collections
 *
 * This component only selects from a given list from options but does not
 * change the selection by creating new tags or collections. However, basic
 * list filtering is done.
 * */
const TagSelector = observer(({ selection, onSelect }: ITagSelector) => {
  const {
    tagStore: { tagList },
    tagCollectionStore: { tagCollectionList },
  } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  // Instead of creating a new array by filtering out the root node, two slices
  // (cheap copies) will be created, one ending before the root and the other
  // starting afterwards. This is a bit cheaper and should have the similar or
  // better performance.
  const rootIndex = useMemo(
    () => tagCollectionList.findIndex((c) => c.id === ROOT_TAG_COLLECTION_ID),
    [tagCollectionList],
  );

  const normalizedQuery = query.toLowerCase();
  const filterMap = (items: TagItem[]) => {
    return items
      .filter((t) => t.name.toLowerCase().indexOf(normalizedQuery) >= 0)
      .map((t) => (
        <Option
          key={t.id}
          selected={selection === t}
          value={t.name}
          onClick={() => {
            onSelect(t);
            setQuery(t.name);
            setIsOpen(false);
          }}
        />
      ));
  };

  return (
    <div
      role="combobox"
      onBlur={(e) => {
        if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('[role="option"]')) {
          return;
        }
        setIsOpen(false);
        if (selection !== undefined) {
          setQuery(selection.name);
        }
      }}
    >
      <Flyout
        open={isOpen}
        placement="bottom"
        target={
          <input
            type="text"
            value={query}
            aria-autocomplete="list"
            onFocus={() => setIsOpen(true)}
            onChange={(e) => {
              setIsOpen(true);
              setQuery(e.target.value);
            }}
          />
        }
      >
        <Listbox>
          {filterMap(tagCollectionList.slice(0, rootIndex))}
          {filterMap(tagCollectionList.slice(rootIndex + 1))}
          {filterMap(tagList)}
        </Listbox>
      </Flyout>
    </div>
  );
});

export default TagSelector;
