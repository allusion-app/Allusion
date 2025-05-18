import { computed } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  ForwardedRef,
  ReactElement,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Grid, GridCell, IconButton, IconSet, Row, Tag } from 'widgets';
import { RowProps, useGridFocus } from 'widgets/combobox/Grid';
import { Flyout } from 'widgets/popovers';
import { useStore } from '../contexts/StoreContext';
import { ClientTag } from '../entities/Tag';
import { useComputed } from '../hooks/mobx';
import { debounce } from 'common/timeout';
import { useGalleryInputKeydownHandler } from '../hooks/useHandleInputKeydown';

export interface TagSelectorProps {
  selection: ClientTag[];
  isNotInherithedList?: [ClientTag, boolean][];
  onSelect: (item: ClientTag) => void;
  onDeselect: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
  onClear: () => void;
  disabled?: boolean;
  extraIconButtons?: ReactElement;
  renderCreateOption?: (
    inputText: string,
    resetTextBox: () => void,
  ) => ReactElement<RowProps> | ReactElement<RowProps>[];
  multiline?: boolean;
  filter?: (tag: ClientTag) => boolean;
  showTagContextMenu?: (e: React.MouseEvent<HTMLElement>, tag: ClientTag) => void;
  suggestionsUpdateDependency?: number;
}

const TagSelector = (props: TagSelectorProps) => {
  const {
    selection,
    isNotInherithedList,
    onSelect,
    onDeselect,
    onTagClick,
    showTagContextMenu,
    onClear,
    disabled,
    extraIconButtons,
    renderCreateOption,
    multiline,
    filter,
    suggestionsUpdateDependency,
  } = props;
  const gridId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [dobuncedQuery, setDebQuery] = useState('');

  const debounceSetDebQuery = useRef(debounce(setDebQuery, 500)).current;
  useEffect(() => {
    if (query.length > 2) {
      setDebQuery(query);
    }
    // allways call the debounced version to avoud old calls with outdated query values to be set
    debounceSetDebQuery(query);
  }, [debounceSetDebQuery, query]);

  const handleChange = useRef((e: React.ChangeEvent<HTMLInputElement>) => {
    setIsOpen(true);
    setQuery(e.target.value);
  }).current;

  const clearSelection = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      setQuery('');
      onClear();
    },
    [onClear],
  );

  const isInputEmpty = query.length === 0;

  const gridRef = useRef<HTMLDivElement>(null);
  const [activeDescendant, handleGridFocus] = useGridFocus(gridRef);
  const handleGalleryInput = useGalleryInputKeydownHandler();
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
        handleGalleryInput(e);
        handleGridFocus(e);
      }
    },
    [handleGridFocus, onDeselect, isInputEmpty, selection, handleGalleryInput],
  );

  const handleBlur = useRef((e: React.FocusEvent<HTMLDivElement>) => {
    // If anything is blurred, and the new focus is not the input nor the flyout, close the flyout
    const isFocusingOption =
      e.relatedTarget instanceof HTMLElement && e.relatedTarget.matches('div[role="row"]');
    if (isFocusingOption || e.relatedTarget === inputRef.current) {
      return;
    }
    setQuery('');
    setIsOpen(false);
  }).current;

  const handleFocus = useRef(() => setIsOpen(true)).current;

  const handleBackgroundClick = useCallback(() => inputRef.current?.focus(), []);

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

  const selectionSummary = useMemo((): [ClientTag, boolean][] => {
    if (isNotInherithedList) {
      return isNotInherithedList;
    } else {
      return selection.map((t) => [t, true] as [ClientTag, boolean]);
    }
  }, [selection, isNotInherithedList]);

  return (
    <div
      role="combobox"
      aria-expanded={isOpen}
      aria-haspopup="grid"
      aria-owns={gridId}
      className={`input multiautocomplete tag-selector ${multiline ? 'multiline' : ''}`}
      onBlur={handleBlur}
      onClick={handleBackgroundClick}
    >
      <Flyout
        isOpen={isOpen}
        cancel={() => setIsOpen(false)}
        placement="bottom-start"
        ignoreCloseForElementOnBlur={inputRef.current || undefined}
        target={(ref) => (
          <div ref={ref} className="multiautocomplete-input">
            <div className="input-wrapper">
              {selectionSummary.map((tt) => (
                <SelectedTag
                  key={tt[0].id}
                  tag={tt[0]}
                  onDeselect={tt[1] ? onDeselect : undefined}
                  onTagClick={onTagClick}
                  showContextMenu={showTagContextMenu}
                />
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
        )}
      >
        <SuggestedTagsList
          ref={gridRef}
          id={gridId}
          filter={filter}
          query={dobuncedQuery}
          selection={selection}
          toggleSelection={toggleSelection}
          resetTextBox={resetTextBox.current}
          renderCreateOption={renderCreateOption}
          suggestionsUpdateDependency={suggestionsUpdateDependency}
        />
      </Flyout>
    </div>
  );
};

export { TagSelector };

interface SelectedTagProps {
  tag: ClientTag;
  onDeselect?: (item: ClientTag) => void;
  onTagClick?: (item: ClientTag) => void;
  showContextMenu?: (e: React.MouseEvent<HTMLElement>, item: ClientTag) => void;
}

const SelectedTag = observer((props: SelectedTagProps) => {
  const { tag, onDeselect, onTagClick, showContextMenu } = props;
  return (
    <Tag
      text={tag.name}
      color={tag.viewColor}
      onRemove={onDeselect ? () => onDeselect(tag) : undefined}
      onClick={onTagClick !== undefined ? () => onTagClick(tag) : undefined}
      onContextMenu={showContextMenu !== undefined ? (e) => showContextMenu(e, tag) : undefined}
    />
  );
});

interface SuggestedTagsListProps {
  id: string;
  query: string;
  selection: readonly ClientTag[];
  filter?: (tag: ClientTag) => boolean;
  toggleSelection: (isSelected: boolean, tag: ClientTag) => void;
  resetTextBox: () => void;
  renderCreateOption?: (
    inputText: string,
    resetTextBox: () => void,
  ) => ReactElement<RowProps> | ReactElement<RowProps>[];
  suggestionsUpdateDependency?: number;
}

const SuggestedTagsList = observer(
  React.forwardRef(function TagsList(
    props: SuggestedTagsListProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const {
      id,
      query,
      selection,
      filter = () => true,
      toggleSelection,
      resetTextBox,
      renderCreateOption,
      suggestionsUpdateDependency,
    } = props;
    const { tagStore } = useStore();

    const suggestions = useMemo(
      () =>
        computed(() => {
          if (query.length === 0) {
            if (tagStore.count > 50) {
              return selection;
            } else {
              return tagStore.tagList.filter(filter);
            }
          } else {
            const textLower = query.toLowerCase();
            return tagStore.tagList
              .filter((t) => t.name.toLowerCase().includes(textLower))
              .filter(filter);
          }
        }),
      // eslint-disable-next-line react-hooks/exhaustive-deps
      [query, tagStore.tagList, filter, suggestionsUpdateDependency],
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
        {suggestions.length === 0 &&
          (query.length > 0
            ? renderCreateOption?.(query, resetTextBox)
            : tagStore.count > 50 && <span>Type to select tags</span>)}
      </Grid>
    );
  }),
);

interface TagOptionProps {
  id?: string;
  tag: ClientTag;
  selected?: boolean;
  toggleSelection: (isSelected: boolean, tag: ClientTag) => void;
  onContextMenu?: (e: React.MouseEvent<HTMLElement>, tag: ClientTag) => void;
}

export const TagOption = observer(
  ({ id, tag, selected, toggleSelection, onContextMenu }: TagOptionProps) => {
    const [path, hint] = useComputed(() => {
      const path = tag.path
        .map((v) => (v.startsWith('#') ? '&nbsp;<b>' + v.slice(1) + '</b>&nbsp;' : v))
        .join(' › ');
      const hint = path.slice(
        0,
        Math.max(0, path.length - tag.name.length - (tag.name.startsWith('#') ? 18 : 3)),
      );
      return [path, hint];
    }).get();

    const isHeader = useMemo(() => tag.name.startsWith('#'), [tag.name]);

    return (
      <Row
        id={id}
        value={isHeader ? '<b>' + tag.name.slice(1) + '</b>' : tag.name}
        selected={selected}
        icon={<span style={{ color: tag.viewColor }}>{IconSet.TAG}</span>}
        onClick={() => toggleSelection(selected ?? false, tag)}
        tooltip={path}
        onContextMenu={onContextMenu !== undefined ? (e) => onContextMenu(e, tag) : undefined}
        valueIsHtml
      >
        {hint.length > 0 ? (
          <GridCell className="tag-option-hint" __html={hint}></GridCell>
        ) : (
          <GridCell />
        )}
      </Row>
    );
  },
);
