import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  ForwardedRef,
  ReactElement,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import { generateId } from 'src/entities/ID';
import { ClientTag } from 'src/entities/Tag';
import { IconButton, IconSet, Tag, Grid, Row, GridCell } from 'widgets';
import { RowProps, useGridFocus } from 'widgets/Combobox/Grid';
import { Flyout, useTooltip } from 'widgets/popovers';
import StoreContext from '../contexts/StoreContext';

export interface TagSelectorProps {
  selection: ClientTag[];
  onSelect: (item: ClientTag) => void;
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
  onClear: () => void;
  multiselectable: boolean;
  disabled?: boolean;
  extraIconButtons?: ReactElement;
  placeholder?: string;
  renderCreateOption?: (
    inputText: string,
    resetTextBox: () => void,
    isFocused: (index: number) => boolean,
  ) => ReactElement<RowProps> | ReactElement<RowProps>[];
}

const TagSelector = (props: TagSelectorProps) => {
  const {
    selection,
    onSelect,
    onDeselect,
    onTagClick,
    onClear,
    multiselectable,
    disabled,
    extraIconButtons,
    placeholder,
    renderCreateOption,
  } = props;
  const gridId = useRef(generateId()).current;
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
  const [focusedOption, handleListFocus] = useGridFocus(gridRef);
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Backspace') {
        e.stopPropagation();

        // Remove last item from selection with backspace
        if (isInputEmpty && selection.length > 0) {
          onDeselect(selection[selection.length - 1]);
        }
      } else if (e.key === 'Escape') {
        setQuery('');
        setIsOpen(false);
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
      className="input"
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
              <SelectedTags selection={selection} onDeselect={onDeselect} onTagClick={onTagClick} />
              <input
                disabled={disabled}
                type="text"
                value={query}
                aria-autocomplete="list"
                onChange={handleChange}
                onKeyDown={handleKeyDown}
                aria-controls={gridId}
                ref={inputRef}
                onFocus={handleFocus}
                placeholder={selection.length === 0 ? placeholder : undefined}
              />
            </div>
            {extraIconButtons}
            <IconButton icon={IconSet.CLOSE} text="Clear" onClick={clearSelection} />
          </div>
        }
      >
        <SuggestedTagsList
          ref={gridRef}
          multiselectable={multiselectable}
          id={gridId}
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

export { TagSelector };

interface SelectedTagsProps {
  selection: readonly ClientTag[];
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
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
  selection: readonly ClientTag[];
  toggleSelection: (isSelected: boolean, tag: ClientTag) => void;
  resetTextBox: () => void;
  focusedOption: number;
  multiselectable: boolean;
  renderCreateOption?: (
    inputText: string,
    resetTextBox: () => void,
    isFocused: (index: number) => boolean,
  ) => ReactElement<RowProps> | ReactElement<RowProps>[];
}

const SuggestedTagsList = observer(
  (props: SuggestedTagsListProps, ref: ForwardedRef<HTMLDivElement>) => {
    const {
      id,
      query,
      selection,
      toggleSelection,
      focusedOption,
      resetTextBox,
      multiselectable,
      renderCreateOption,
    } = props;
    const { tagStore } = useContext(StoreContext);

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
      <Grid ref={ref} id={id} multiselectable={multiselectable}>
        {suggestions.get().map((tag, index) => {
          const selected = selection.includes(tag);
          return (
            <TagOption
              key={tag.id}
              tag={tag}
              selected={selected ? selected : multiselectable ? selected : undefined}
              focused={focusedOption === index}
              toggleSelection={toggleSelection}
            />
          );
        })}
        {suggestions.get().length === 0 &&
          renderCreateOption?.(query, resetTextBox, (index) => index === focusedOption)}
      </Grid>
    );
  },
  { forwardRef: true },
);

interface TagOptionProps {
  tag: ClientTag;
  selected?: boolean;
  focused: boolean;
  toggleSelection: (isSelected: boolean, tag: ClientTag) => void;
}

export const TagOption = observer(({ tag, selected, focused, toggleSelection }: TagOptionProps) => {
  const hint = useRef(
    computed(() =>
      tag.treePath
        .slice(0, -1)
        .map((t) => t.name)
        .join(' › '),
    ),
  ).current;
  const { onHide, onShow } = useTooltip(hint.get());

  return (
    <Row
      value={tag.name}
      selected={selected}
      icon={<span style={{ color: tag.viewColor }}>{IconSet.TAG}</span>}
      onClick={() => toggleSelection(selected ?? false, tag)}
      focused={focused}
    >
      <GridCell className="tag-option-hint" onMouseOutCapture={onHide} onMouseOverCapture={onShow}>
        {hint.get()}
      </GridCell>
    </Row>
  );
});
