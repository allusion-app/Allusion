import { autorun, computed, IComputedValue, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, {
  ForwardedRef,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { TagOption } from 'src/frontend/components/TagSelector';
import FocusManager from 'src/frontend/FocusManager';
import { useAction } from 'src/frontend/hooks/useAction';
import { debounce } from 'src/frontend/utils';
import { Grid, Tag } from 'widgets';
import { Row, RowSeparator, useGridFocus } from 'widgets/Combobox/Grid';
import { IconSet } from 'widgets/Icons';
import { ToolbarButton } from 'widgets/menus';
import { useStore } from '../../contexts/StoreContext';
import { Tooltip } from './PrimaryCommands';

const POPUP_ID = 'tag-editor-popup';

const FileTagEditor = observer(() => {
  const { uiStore } = useStore();
  return (
    <>
      <ToolbarButton
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
  const { uiStore } = useStore();
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
  // Autofocus
  useEffect(() => {
    return autorun(() => {
      if (uiStore.isToolbarTagPopoverOpen) {
        requestAnimationFrame(() => requestAnimationFrame(() => inputRef.current?.focus()));
      }
    });
  }, [uiStore]);

  const handleInput = useRef((e: React.ChangeEvent<HTMLInputElement>) =>
    setInputText(e.target.value),
  ).current;

  const gridRef = useRef<HTMLDivElement>(null);
  const [activeDescendant, handleGridFocus] = useGridFocus(gridRef);

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
    <div
      ref={panelRef}
      id="tag-editor"
      style={{ height: storedHeight ?? undefined }}
      role="combobox"
      aria-haspopup="grid"
      aria-expanded="true"
      aria-owns={POPUP_ID}
    >
      <input
        type="text"
        spellCheck={false}
        value={inputText}
        aria-autocomplete="list"
        onChange={handleInput}
        onKeyDown={handleGridFocus}
        className="input"
        aria-controls={POPUP_ID}
        aria-activedescendant={activeDescendant}
        ref={inputRef}
      />
      <MatchingTagsList
        ref={gridRef}
        inputText={inputText}
        counter={counter}
        resetTextBox={resetTextBox}
      />
      <TagSummary counter={counter} removeTag={removeTag} />
    </div>
  );
};

interface MatchingTagsListProps {
  inputText: string;
  counter: IComputedValue<Map<ClientTag, number>>;
  resetTextBox: () => void;
}

const MatchingTagsList = observer(
  function MatchingTagsList(
    { inputText, counter, resetTextBox }: MatchingTagsListProps,
    ref: ForwardedRef<HTMLDivElement>,
  ) {
    const { tagStore, uiStore } = useStore();

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
    ).get();

    const toggleSelection = useAction((isSelected: boolean, tag: ClientTag) => {
      const operation = isSelected
        ? (f: ClientFile) => f.removeTag(tag)
        : (f: ClientFile) => f.addTag(tag);
      uiStore.fileSelection.forEach(operation);
      resetTextBox();
    });

    return (
      <Grid ref={ref} id={POPUP_ID} multiselectable>
        {matches.map((tag) => {
          const selected = counter.get().get(tag) !== undefined;
          return (
            <TagOption
              key={tag.id}
              id={`${POPUP_ID}-${tag.id}`}
              tag={tag}
              selected={selected}
              toggleSelection={toggleSelection}
            />
          );
        })}
        <CreateOption
          inputText={inputText}
          hasMatches={matches.length > 0}
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
  resetTextBox: () => void;
}

const CreateOption = ({ inputText, hasMatches, resetTextBox }: CreateOptionProps) => {
  const { tagStore, uiStore } = useStore();

  const createTag = useCallback(async () => {
    const newTag = await tagStore.create(tagStore.root, inputText);
    runInAction(() => {
      for (const f of uiStore.fileSelection) {
        f.addTag(newTag);
      }
    });
    resetTextBox();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [inputText, resetTextBox]);

  if (inputText.length === 0) {
    return null;
  }

  return (
    <>
      {hasMatches && <RowSeparator />}
      <Row
        id="tag-editor-create-option"
        selected={false}
        value={`Create Tag "${inputText}"`}
        onClick={createTag}
        icon={IconSet.TAG_ADD}
      />
    </>
  );
};

interface TagSummaryProps {
  counter: IComputedValue<Map<ClientTag, number>>;
  removeTag: (tag: ClientTag) => void;
}

const TagSummary = observer(({ counter, removeTag }: TagSummaryProps) => {
  const { uiStore } = useStore();

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
  const { uiStore } = useStore();

  const handleBlur = useRef((e: React.FocusEvent) => {
    const button = e.currentTarget.previousElementSibling as HTMLElement;
    if (e.relatedTarget !== button && !e.currentTarget.contains(e.relatedTarget as Node)) {
      uiStore.closeToolbarTagPopover();
      FocusManager.focusGallery();
    }
  }).current;

  const handleClose = useRef((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      uiStore.closeToolbarTagPopover();
      FocusManager.focusGallery();
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
