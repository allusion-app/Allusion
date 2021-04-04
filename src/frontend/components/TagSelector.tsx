import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useRef, useState } from 'react';
import { generateId } from 'src/entities/ID';
import { ClientTag, ROOT_TAG_ID } from 'src/entities/Tag';
import StoreContext from 'src/frontend/contexts/StoreContext';
import { Option } from 'widgets';
import { ControlledListbox, controlledListBoxKeyDown } from 'widgets/Combobox/ControlledListBox';
import { Flyout } from 'widgets/popovers';

interface ITagSelector {
  selection: ClientTag | undefined;
  onSelect: (item?: ClientTag) => void;
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
  const normalizedQuery = query.toLowerCase();

  const suggestions = tagStore.tagList.filter(
    (t) => t.id !== ROOT_TAG_ID && t.name.toLowerCase().indexOf(normalizedQuery) >= 0,
  );

  const options = suggestions.map((t) => {
    const isSelected = selection === t;
    return {
      id: t.id,
      selected: isSelected,
      value: t.name,
      onClick: () => onSelect(isSelected ? undefined : t),
    };
  });

  // Todo: clamp this value when list size changes
  const [focusedOption, setFocusedOption] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.stopPropagation();
      }
      controlledListBoxKeyDown(e, listRef, setFocusedOption, focusedOption);
    },
    [focusedOption],
  );

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
            onKeyDown={handleKeyDown}
            aria-controls={listboxId.current}
            onBlur={() => setQuery(selection?.name || '')}
          />
        }
      >
        <ControlledListbox id={listboxId.current} multiselectable listRef={listRef}>
          {options.map((o, i) => {
            return (
              <React.Fragment key={o.id}>
                <Option {...o} focused={focusedOption === i} />
              </React.Fragment>
            );
          })}
        </ControlledListbox>
      </Flyout>
    </div>
  );
});

export default TagSelector;
