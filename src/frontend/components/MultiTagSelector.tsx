import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { ForwardedRef, ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { generateId } from 'src/entities/ID';
import { ClientTag } from 'src/entities/Tag';
import { IconButton, IconSet, Listbox, Option, Tag } from 'widgets';
import { IOption, useListboxFocus } from 'widgets/Combobox/Listbox';
import { Flyout } from 'widgets/popovers';
import { useStore } from '../contexts/StoreContext';

interface IMultiTagSelector {
  selection: Readonly<ClientTag>[];
  onSelect: (item: Readonly<ClientTag>) => void;
  onDeselect: (item: Readonly<ClientTag>) => void;
  onTagClick?: (item: Readonly<ClientTag>) => void;
  onClear: () => void;
  disabled?: boolean;
  extraIconButtons?: ReactElement;
  placeholder?: string;
  renderCreateOption?: (
    inputText: string,
    resetTextBox: () => void,
    isFocused: (index: number) => boolean,
  ) => ReactElement<IOption> | ReactElement<IOption>[];
}

const MultiTagSelector = (props: IMultiTagSelector) => {
  const {
    selection,
    onSelect,
    onDeselect,
    onTagClick,
    onClear,
    disabled,
    extraIconButtons,
    placeholder,
    renderCreateOption,
  } = props;
  const listboxID = useRef(generateId());
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleChange = useRef((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(true);
    setQuery(e.target.value);
  });

  const clearSelection = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  const isInputEmpty = query.length === 0;

  const listRef = useRef<HTMLUListElement>(null);
  const [focusedOption, handleListFocus] = useListboxFocus(listRef);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.stopPropagation();

        // Remove last item from selection with backspace
        if (isInputEmpty && selection.length > 0) {
          onDeselect(selection[selection.length - 1]);
        }
      } else {
        handleListFocus(e);
      }
    },
    [handleListFocus, onDeselect, isInputEmpty, selection],
  );

  const handleBlur = useRef((e: React.FocusEvent<HTMLDivElement>) => {
    // If anything is blurred, and the new focus is not the input nor the flyout, close the flyout
    const isFocusingFlyOut =
      e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('li[role="option"]');
    const isFocusingInput = e.relatedTarget === inputRef.current;
    if (isFocusingFlyOut || isFocusingInput) {
      return;
    }
    setQuery('');
    setIsOpen(false);
  });

  const handleFocus = useRef(() => setIsOpen(true));

  const resetTextBox = useRef(() => {
    inputRef.current?.focus();
    setQuery('');
  });

  const toggleSelection = useCallback(
    (isSelected: boolean, tag: Readonly<ClientTag>) => {
      if (!isSelected) {
        onSelect(tag);
      } else {
        onDeselect(tag);
      }
      resetTextBox.current();
    },
    [onDeselect, onSelect],
  );

  return (
    <div role="combobox" aria-expanded={isOpen} className="input" onBlur={handleBlur.current}>
      <Flyout
        isOpen={isOpen}
        cancel={() => setIsOpen(false)}
        placement="bottom-start"
        ignoreCloseForElementOnBlur={inputRef.current || undefined}
        target={
          <div className="multiautocomplete-input">
            <div className="input-wrapper">
              <SelectedTags selection={selection} onDeselect={onDeselect} onTagClick={onTagClick} />
              <input
                disabled={disabled}
                type="text"
                value={query}
                aria-autocomplete="list"
                onChange={handleChange.current}
                onKeyDown={handleKeyDown}
                aria-controls={listboxID.current}
                ref={inputRef}
                onFocus={handleFocus.current}
                placeholder={placeholder}
              />
            </div>
            {extraIconButtons}
            <IconButton icon={IconSet.CLOSE} text="Clear" onClick={clearSelection} />
          </div>
        }
      >
        <SuggestedTagsList
          ref={listRef}
          id={listboxID.current}
          query={query}
          selection={selection}
          toggleSelection={toggleSelection}
          resetTextBox={resetTextBox.current}
          focusedOption={focusedOption}
          renderCreateOption={renderCreateOption}
        />
      </Flyout>
    </div>
  );
};

export { MultiTagSelector };

interface SelectedTagsProps {
  selection: readonly Readonly<ClientTag>[];
  onDeselect: (item: Readonly<ClientTag>) => void;
  onTagClick?: (item: Readonly<ClientTag>) => void;
}

const SelectedTags = observer((props: SelectedTagsProps) => {
  const { selection, onDeselect, onTagClick } = props;

  return (
    <>
      {selection.map((t, i) => (
        <Tag
          key={`${t.id}-${i}`}
          text={t.name}
          color={t.viewColor}
          onRemove={() => onDeselect(t)}
          onClick={onTagClick ? () => onTagClick(t) : undefined}
        />
      ))}
    </>
  );
});

interface SuggestedTagsListProps {
  id: string;
  query: string;
  selection: readonly Readonly<ClientTag>[];
  toggleSelection: (isSelected: boolean, tag: Readonly<ClientTag>) => void;
  resetTextBox: () => void;
  focusedOption: number;
  renderCreateOption?: (
    inputText: string,
    resetTextBox: () => void,
    isFocused: (index: number) => boolean,
  ) => ReactElement<IOption> | ReactElement<IOption>[];
}

const SuggestedTagsList = observer(
  (props: SuggestedTagsListProps, ref: ForwardedRef<HTMLUListElement>) => {
    const {
      id,
      query,
      selection,
      toggleSelection,
      focusedOption,
      resetTextBox,
      renderCreateOption,
    } = props;
    const { tagStore } = useStore();

    const suggestions = useMemo(
      () =>
        computed(() => {
          if (query.length === 0) {
            return tagStore.tagList;
          } else {
            const textLower = query.toLowerCase();
            return tagStore.tagList.filter((t) => t.name.toLowerCase().indexOf(textLower) >= 0);
          }
        }),
      [query, tagStore],
    );

    return (
      <Listbox ref={ref} id={id} multiselectable>
        {suggestions.get().map((tag, index) => {
          const selected = selection.includes(tag);
          return (
            <Option
              key={tag.id}
              value={tag.name}
              selected={selected}
              icon={<span style={{ color: tag.viewColor }}>{IconSet.TAG}</span>}
              onClick={() => toggleSelection(selected, tag)}
              focused={focusedOption === index}
            />
          );
        })}
        {suggestions.get().length === 0 &&
          renderCreateOption?.(query, resetTextBox, (index) => index === focusedOption)}
      </Listbox>
    );
  },
  { forwardRef: true },
);
