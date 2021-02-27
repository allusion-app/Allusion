import React, { useContext, useMemo, useRef, useState } from 'react';
import { action, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ClientTag, ROOT_TAG_ID } from 'src/entities/Tag';
import { generateId } from 'src/entities/ID';

import StoreContext from 'src/frontend/contexts/StoreContext';

import { Listbox, Option } from 'widgets';
import { Flyout } from 'widgets/popovers';

interface ITagSelector {
  selection: ClientTag | undefined;
  onSelect: (item: ClientTag) => void;
}

/**
 * Selects an item from all currently available tags and tag collections
 *
 * This component only selects from a given list from options but does not
 * change the selection by creating new tags or collections. However, basic
 * list filtering is done.
 * */
const TagSelector = observer(({ selection, onSelect }: ITagSelector) => {
  const listboxId = useRef(generateId());
  const { tagStore } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState(selection?.name || '');

  const normalizedQuery = useMemo(() => query.toLowerCase(), [query]);

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      className="input"
      onBlur={(e) => {
        if (e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('[role="option"]')) {
          return;
        }
        setIsOpen(false);
        if (selection !== undefined) {
          runInAction(() => setQuery(selection.name));
        }
      }}
    >
      <Flyout
        isOpen={isOpen}
        cancel={() => setIsOpen(false)}
        placement="bottom-start"
        target={
          <input
            type="text"
            value={query}
            aria-autocomplete="list"
            onChange={(e) => {
              setIsOpen(true);
              setQuery(e.target.value);
            }}
            aria-controls={listboxId.current}
          />
        }
      >
        <Listbox id={listboxId.current}>
          {tagStore.tagList
            .filter(
              (t) => t.id !== ROOT_TAG_ID && t.name.toLowerCase().indexOf(normalizedQuery) >= 0,
            )
            .map((t) => (
              <Option
                key={t.id}
                selected={selection === t}
                value={t.name}
                onClick={action(() => {
                  onSelect(t);
                  setQuery(t.name);
                  setIsOpen(false);
                })}
              />
            ))}
        </Listbox>
      </Flyout>
    </div>
  );
});

export default TagSelector;
