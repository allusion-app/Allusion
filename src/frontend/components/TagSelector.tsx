import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { ForwardedRef, ReactElement, useCallback, useMemo, useRef, useState } from 'react';
import { ClientTag } from 'src/entities/Tag';
import { IconButton, IconSet, Tag, Grid, Row, GridCell } from 'widgets';
import { RowProps, useGridFocus } from 'widgets/Combobox/Grid';
import { Flyout } from 'widgets/popovers';
import { generateWidgetId } from 'widgets/utility';
import { useStore } from '../contexts/StoreContext';
import { useComputed } from '../hooks/mobx';

export interface TagSelectorProps {
  selection: ClientTag[];
  onSelect: (item: ClientTag) => void;
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
  onClear: () => void;
  disabled?: boolean;
  extraIconButtons?: ReactElement;
  renderCreateOption: (
    inputText: string,
    resetTextBox: () => void,
  ) => ReactElement<RowProps> | ReactElement<RowProps>[];
}

const TagSelector = (props: TagSelectorProps) => {
  const {
    selection,
    onSelect,
    onDeselect,
    onTagClick,
    onClear,
    disabled,
    extraIconButtons,
    renderCreateOption,
  } = props;
  const gridId = useRef(generateWidgetId('__suggestions')).current;
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');

  const handleChange = useRef((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(true);
    setQuery(e.target.value);
  }).current;

  const clearSelection = useCallback(() => {
    setQuery('');
    onClear();
  }, [onClear]);

  const isInputEmpty = query.length === 0;

  const gridRef = useRef<HTMLDivElement>(null);
  const [activeDescendant, handleGridFocus] = useGridFocus(gridRef);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.stopPropagation();

        // Remove last item from selection with backspace
        if (isInputEmpty && selection.length > 0) {
          onDeselect(selection[selection.length - 1]);
        }
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setQuery('');
        setIsOpen(false);
      } else {
        handleGridFocus(e);
      }
    },
    [handleGridFocus, onDeselect, isInputEmpty, selection],
  );

  const handleBlur = useRef((e: React.FocusEvent<HTMLDivElement>) => {
    // If anything is blurred, and the new focus is not the input nor the flyout, close the flyout
    const isFocusingOption =
      e.relatedTarget instanceof HTMLElement &&
      e.relatedTarget.classList.contains('combobox-popup-option');
    if (isFocusingOption || e.relatedTarget === inputRef.current) {
      return;
    }
    setQuery('');
    setIsOpen(false);
  }).current;

  const handleFocus = useRef(() => setIsOpen(true)).current;

  const resetTextBox = useRef(() => {
    inputRef.current?.focus();
    setQuery('');
  });

  const toggleSelection = useCallback(
    (isSelected: boolean, tag: ClientTag) => {
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
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="grid"
      aria-owns={gridId}
      className="input multiautocomplete"
      onBlur={handleBlur}
    >
      <Flyout
        isOpen={isOpen}
        cancel={() => setIsOpen(false)}
        placement="bottom-start"
        ignoreCloseForElementOnBlur={inputRef.current || undefined}
        target={
          <div className="multiautocomplete-input">
            <div className="input-wrapper">
              {selection.map((t) => (
                <SelectedTag key={t.id} tag={t} onDeselect={onDeselect} onTagClick={onTagClick} />
              ))}
              <input
                disabled={disabled}
                type="text"
                value={query}
                aria-autocomplete="list"
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                aria-controls={gridId}
                aria-activedescendant={activeDescendant}
                ref={inputRef}
                onFocus={handleFocus}
              />
            </div>
            {extraIconButtons}
            <IconButton icon={IconSet.CLOSE} text="Clear" onClick={clearSelection} />
          </div>
        }
      >
        <SuggestedTagsList
          ref={gridRef}
          id={gridId}
          query={query}
          selection={selection}
          toggleSelection={toggleSelection}
          resetTextBox={resetTextBox.current}
          renderCreateOption={renderCreateOption}
        />
      </Flyout>
    </div>
  );
};

export { TagSelector };

interface SelectedTagProps {
  tag: ClientTag;
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
}

const SelectedTag = observer((props: SelectedTagProps) => {
  const { tag, onDeselect, onTagClick } = props;
  return (
    <Tag
      text={tag.name}
      color={tag.viewColor}
      onRemove={() => onDeselect(tag)}
      onClick={onTagClick !== undefined ? () => onTagClick(tag) : undefined}
    />
  );
});

interface SuggestedTagsListProps {
  id: string;
  query: string;
  selection: readonly ClientTag[];
  toggleSelection: (isSelected: boolean, tag: ClientTag) => void;
  resetTextBox: () => void;
  renderCreateOption: (
    inputText: string,
    resetTextBox: () => void,
  ) => ReactElement<RowProps> | ReactElement<RowProps>[];
}

const SuggestedTagsList = observer(
  (props: SuggestedTagsListProps, ref: ForwardedRef<HTMLDivElement>) => {
    const { id, query, selection, toggleSelection, resetTextBox, renderCreateOption } = props;
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
    ).get();

    return (
      <Grid ref={ref} id={id} multiselectable>
        {suggestions.map((tag) => {
          const selected = selection.includes(tag);
          return (
            <TagOption
              id={`${id}${tag.id}`}
              key={tag.id}
              tag={tag}
              selected={selected}
              toggleSelection={toggleSelection}
            />
          );
        })}
        {suggestions.length === 0 && renderCreateOption(query, resetTextBox)}
      </Grid>
    );
  },
  { forwardRef: true },
);

interface TagOptionProps {
  id?: string;
  tag: ClientTag;
  selected?: boolean;
  toggleSelection: (isSelected: boolean, tag: ClientTag) => void;
}

export const TagOption = observer(({ id, tag, selected, toggleSelection }: TagOptionProps) => {
  const [path, hint] = useComputed(() => {
    const path = tag.treePath.map((t) => t.name).join(' › ');
    const hint = path.slice(0, Math.max(0, path.length - tag.name.length - 3));
    return [path, hint];
  }).get();

  return (
    <Row
      id={id}
      value={tag.name}
      selected={selected}
      icon={<span style={{ color: tag.viewColor }}>{IconSet.TAG}</span>}
      onClick={() => toggleSelection(selected ?? false, tag)}
      tooltip={path}
    >
      {hint.length > 0 ? <GridCell className="tag-option-hint">{hint}</GridCell> : <GridCell />}
    </Row>
  );
});
