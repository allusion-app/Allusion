import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { ReactElement, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { generateId } from 'src/entities/ID';
import { ClientTag } from 'src/entities/Tag';
import { IconButton, IconSet, Option, Tag } from 'widgets';
import { ControlledListbox, controlledListBoxKeyDown } from 'widgets/Combobox/ControlledListBox';
import { IOption } from 'widgets/Combobox/Listbox';
import { MenuDivider } from 'widgets/menus';
import { Flyout } from 'widgets/popovers';
import StoreContext from '../contexts/StoreContext';

interface IMultiTagSelector {
  selection: ClientTag[];
  onSelect: (item: ClientTag) => void;
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
  onClear: () => void;
  tagLabel?: (item: ClientTag) => string;
  disabled?: boolean;
  autoFocus?: boolean;
  extraOptions?: {
    id: string;
    label: string | ((input: string) => string);
    // TODO: couldn't figure out how to type is properly. Should just return whatever is returned where it's being defined
    action: (input: string) => any | Promise<any>;
    icon?: JSX.Element;
    resetQueryOnAction?: boolean;
    onlyShowWithoutSuggestions?: boolean;
  }[];
  extraIconButtons?: ReactElement;
  defaultPrevented?: boolean;
  // Whether to automatically open the fly-out on focus. Otherwise, opens when pressing any key
  defaultOpen?: boolean;
  placeholder?: string;
}

const MultiTagSelector = observer((props: IMultiTagSelector) => {
  const {
    selection,
    onSelect,
    onDeselect,
    onTagClick,
    onClear,
    tagLabel = action((t: ClientTag) => t.name),
    disabled,
    extraOptions = [],
    extraIconButtons,
    autoFocus,
    defaultOpen = true,
    placeholder,
  } = props;
  const listboxID = useRef(generateId());
  const inputRef = useRef<HTMLInputElement>(null);
  const { tagStore } = useContext(StoreContext);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const normalizedQuery = query.toLowerCase();

  const suggestions = tagStore.flatTagHierarchyWithoutRoot.filter(
    (t) => t.name.toLowerCase().indexOf(normalizedQuery) >= 0,
  );

  // Assemble list of options
  const options = useMemo(() => {
    const res: (IOption & { id: string; divider?: boolean })[] = suggestions.map((t, i) => {
      const isSelected = selection.includes(t);
      const hint = t.recursiveParentTags.map((t) => t.name).join(' › ');
      return {
        id: `${t.id}-${i}`,
        selected: isSelected,
        value: t.name,
        hint,
        // TODO: Same as TagFilesPopover: "title" should be custom tooltip
        title: hint ? [hint, t.name].join(' › ') : t.name,
        onClick: () => {
          if (!isSelected) {
            onSelect(t);
          } else {
            onDeselect(t);
          }
          inputRef.current?.focus();
          setQuery('');
        },
      };
    });

    for (const opt of extraOptions) {
      if (!opt.onlyShowWithoutSuggestions || suggestions.length === 0) {
        res.push({
          id: opt.id,
          value: typeof opt.label === 'string' ? opt.label : opt.label(query),
          onClick: () => {
            inputRef.current?.focus();
            if (opt.resetQueryOnAction) setQuery('');
            return opt.action(query);
          },
          icon: opt.icon,
          divider: opt === extraOptions[0] && res.length !== 0,
        });
      }
    }
    return res;
  }, [extraOptions, onDeselect, onSelect, query, selection, suggestions]);

  // Todo: clamp this value when list size changes
  const [focusedOption, setFocusedOption] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.stopPropagation();

        // Remove last item from selection with backspace
        if (query.length === 0 && selection.length > 0) {
          onDeselect(selection[selection.length - 1]);
        }
      }
      controlledListBoxKeyDown(e, listRef, setFocusedOption, focusedOption);
    },
    [focusedOption, onDeselect, query.length, selection],
  );

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      className="input"
      onBlur={(e) => {
        // If anything is blurred, and the new focus is not the input nor the flyout, close the flyout
        const isFocusingFlyOut =
          e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('[role="option"]');
        const isFocusingInput = e.relatedTarget === inputRef.current;
        if (isFocusingFlyOut || isFocusingInput) {
          return;
        }
        setQuery('');
        setIsOpen(false);
      }}
    >
      <Flyout
        isOpen={isOpen}
        cancel={() => setIsOpen(false)}
        placement="bottom-start"
        ignoreCloseForElementOnBlur={inputRef.current || undefined}
        target={
          <div className="multiautocomplete-input">
            <div className="input-wrapper">
              {selection.map((t, i) => (
                <Tag
                  key={`${t.id}-${i}`}
                  text={tagLabel(t)}
                  color={t.viewColor}
                  onRemove={() => onDeselect(t)}
                  onClick={onTagClick ? () => onTagClick(t) : undefined}
                />
              ))}
              <input
                disabled={disabled}
                type="text"
                value={query}
                aria-autocomplete="list"
                onChange={(e) => {
                  setIsOpen(true);
                  setQuery(e.target.value);
                }}
                onKeyDown={handleKeyDown}
                aria-controls={listboxID.current}
                autoFocus={autoFocus}
                ref={inputRef}
                onFocus={defaultOpen ? () => setIsOpen(true) : undefined}
                placeholder={placeholder}
              />
            </div>
            {extraIconButtons}
            <IconButton
              icon={IconSet.CLOSE}
              text="Clear"
              onClick={() => {
                setQuery('');
                onClear();
              }}
            />
          </div>
        }
      >
        <ControlledListbox id={listboxID.current} multiselectable listRef={listRef}>
          {options.map(({ divider, id, ...optionProps }, i) => {
            return (
              <React.Fragment key={id}>
                {divider && <MenuDivider />}
                <Option {...optionProps} focused={focusedOption === i} />
              </React.Fragment>
            );
          })}
        </ControlledListbox>
      </Flyout>
    </div>
  );
});

export { MultiTagSelector };
