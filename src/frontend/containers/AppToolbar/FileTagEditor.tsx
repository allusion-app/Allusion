import { computed, IComputedValue } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  ForwardedRef,
  ReactNode,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { TagOption } from 'src/frontend/components/TagSelector';
import { useAction } from 'src/frontend/hooks/useAction';
import { debounce } from 'src/frontend/utils';
import { Grid, Tag } from 'widgets';
import { Row, RowSeparator, useGridFocus } from 'widgets/Combobox/Grid';
import { IconSet } from 'widgets/Icons';
import { ToolbarButton } from 'widgets/menus';
import StoreContext from '../../contexts/StoreContext';
import { Tooltip } from './PrimaryCommands';

const FileTagEditor = observer(() => {
  const { uiStore } = useContext(StoreContext);
  return (
    <>
      <ToolbarButton
        showLabel="never"
        icon={IconSet.TAG_LINE}
        disabled={uiStore.fileSelection.size === 0 && !uiStore.isToolbarTagPopoverOpen}
        onClick={uiStore.toggleToolbarTagPopover}
        text="Tag selected files"
        tooltip={Tooltip.TagFiles}
      />
      <FloatingPanel>
        <TagEditor />
      </FloatingPanel>
    </>
  );
});

export default FileTagEditor;

const TagEditor = () => {
  const { uiStore } = useContext(StoreContext);
  const [inputText, setInputText] = useState('');
  const counter = useRef(
    computed(() => {
      // Count how often tags are used
      const counter = new Map<ClientTag, number>();
      for (const file of uiStore.fileSelection) {
        for (const tag of file.tags) {
          const count = counter.get(tag);
          counter.set(tag, count !== undefined ? count + 1 : 1);
        }
      }
      return counter;
    }),
  ).current;

  const inputRef = useRef<HTMLInputElement>(null);
  const handleInput = useRef((e: React.ChangeEvent<HTMLInputElement>) =>
    setInputText(e.target.value),
  ).current;

  const gridRef = useRef<HTMLDivElement>(null);
  const [focusedOption, handleFocus] = useGridFocus(gridRef);

  // Remember the height when panel is resized
  const panelRef = useRef<HTMLDivElement>(null);
  const [storedHeight] = useState(localStorage.getItem('tag-editor-height'));
  useEffect(() => {
    if (!panelRef.current) {
      return;
    }
    const storeHeight = debounce((val: string) => localStorage.setItem('tag-editor-height', val));
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (
          mutation.type == 'attributes' &&
          mutation.attributeName === 'style' &&
          panelRef.current
        ) {
          storeHeight(panelRef.current.style.height);
        }
      });
    });
    observer.observe(panelRef.current, { attributes: true });
    return () => observer.disconnect();
  }, []);

  const resetTextBox = useRef(() => {
    setInputText('');
    inputRef.current?.focus();
  }).current;

  const removeTag = useAction((tag: ClientTag) => {
    for (const f of uiStore.fileSelection) {
      f.removeTag(tag);
    }
    inputRef.current?.focus();
  });

  return (
    <div id="tag-editor" ref={panelRef} style={{ height: storedHeight ?? undefined }}>
      <input
        autoFocus
        type="text"
        value={inputText}
        aria-autocomplete="list"
        onChange={handleInput}
        onKeyDown={handleFocus}
        className="input"
        aria-controls="tag-files-listbox"
        ref={inputRef}
      />
      <MatchingTagsList
        ref={gridRef}
        inputText={inputText}
        counter={counter}
        focusedOption={focusedOption}
        resetTextBox={resetTextBox}
      />
      <TagSummary counter={counter} removeTag={removeTag} />
    </div>
  );
};

interface MatchingTagsListProps {
  inputText: string;
  counter: IComputedValue<Map<ClientTag, number>>;
  focusedOption: number;
  resetTextBox: () => void;
}

const MatchingTagsList = observer(
  function MatchingTagsList(
    { inputText, counter, focusedOption, resetTextBox }: MatchingTagsListProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const { tagStore, uiStore } = useContext(StoreContext);

    const matches = useMemo(
      () =>
        computed(() => {
          if (inputText.length === 0) {
            return tagStore.tagList;
          } else {
            const textLower = inputText.toLowerCase();
            return tagStore.tagList.filter((t) => t.name.toLowerCase().includes(textLower));
          }
        }),
      [inputText, tagStore],
    );

    const toggleSelection = useAction((isSelected: boolean, tag: ClientTag) => {
      const operation = isSelected
        ? (f: ClientFile) => f.removeTag(tag)
        : (f: ClientFile) => f.addTag(tag);

      for (const f of uiStore.fileSelection) {
        operation(f);
      }
      resetTextBox();
    });

    return (
      <Grid ref={ref} id="tag-files-listbox" multiselectable>
        {matches.get().map((tag, index) => {
          const selected = counter.get().get(tag) !== undefined;
          return (
            <TagOption
              key={tag.id}
              tag={tag}
              selected={selected}
              focused={focusedOption === index}
              toggleSelection={toggleSelection}
            />
          );
        })}
        <CreateOption
          inputText={inputText}
          hasMatches={matches.get().length > 0}
          isFocused={focusedOption === matches.get().length}
          resetTextBox={resetTextBox}
        />
      </Grid>
    );
  },
  { forwardRef: true },
);

interface CreateOptionProps {
  inputText: string;
  hasMatches: boolean;
  isFocused: boolean;
  resetTextBox: () => void;
}

const CreateOption = ({ inputText, hasMatches, isFocused, resetTextBox }: CreateOptionProps) => {
  const { tagStore, uiStore } = useContext(StoreContext);

  const removeTag = useAction(async () => {
    const newTag = await tagStore.create(tagStore.root, inputText);
    for (const f of uiStore.fileSelection) {
      f.addTag(newTag);
    }
    resetTextBox();
  });

  if (inputText.length === 0) {
    return null;
  }

  return (
    <>
      {hasMatches && <RowSeparator />}
      <Row
        selected={false}
        value={`Create Tag "${inputText}"`}
        onClick={removeTag}
        icon={IconSet.TAG_ADD}
        focused={isFocused}
      />
    </>
  );
};

interface TagSummaryProps {
  counter: IComputedValue<Map<ClientTag, number>>;
  removeTag: (tag: ClientTag) => void;
}

const TagSummary = observer(({ counter, removeTag }: TagSummaryProps) => {
  const { uiStore } = useContext(StoreContext);

  const sortedTags: ClientTag[] = Array.from(counter.get().entries())
    // Sort based on count
    .sort((a, b) => b[1] - a[1])
    .map((pair) => pair[0]);

  return (
    <div>
      {sortedTags.map((t) => (
        <Tag
          key={t.id}
          text={`${t.name}${uiStore.fileSelection.size > 1 ? ` (${counter.get().get(t)})` : ''}`}
          color={t.viewColor}
          onRemove={() => removeTag(t)}
        />
      ))}
      {sortedTags.length === 0 && <i>No tags added yet</i>}
    </div>
  );
});

const FloatingPanel = observer(({ children }: { children: ReactNode }) => {
  const { uiStore } = useContext(StoreContext);

  const handleBlur = useRef((e: React.FocusEvent) => {
    const button = e.currentTarget.previousElementSibling as HTMLElement;
    if (e.relatedTarget !== button && !e.currentTarget.contains(e.relatedTarget as Node)) {
      uiStore.closeToolbarTagPopover();
    }
  }).current;

  const handleClose = useRef((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      uiStore.closeToolbarTagPopover();
    }
  }).current;

  return (
    // FIXME: data attributes placeholder
    <div
      data-popover
      data-open={uiStore.isToolbarTagPopoverOpen}
      className="floating-dialog"
      onBlur={handleBlur}
      onKeyDown={handleClose}
    >
      {uiStore.isToolbarTagPopoverOpen ? children : null}
    </div>
  );
});
