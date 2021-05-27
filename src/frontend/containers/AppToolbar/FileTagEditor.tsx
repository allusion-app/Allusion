import { action, computed, IComputedValue } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { ForwardedRef, ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';
import { debounce } from 'src/frontend/utils';
import { Listbox, Option, Tag } from 'widgets';
import { useListboxFocus } from 'widgets/Combobox/Listbox';
import { IconSet } from 'widgets/Icons';
import { MenuDivider, ToolbarButton } from 'widgets/menus';
import { useStore } from '../../contexts/StoreContext';
import { Tooltip } from './PrimaryCommands';

const FileTagEditor = observer(() => {
  const { uiStore, fileStore } = useStore();
  return (
    <>
      <ToolbarButton
        showLabel="never"
        icon={IconSet.TAG_LINE}
        disabled={fileStore.selection.size === 0 && !uiStore.isToolbarTagPopoverOpen}
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
  const { fileStore } = useStore();
  const [inputText, setInputText] = useState('');
  const counter = useRef(
    computed(() => {
      // Count how often tags are used
      const counter = new Map<Readonly<ClientTag>, number>();
      for (const file of fileStore.selection) {
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
  );

  const listRef = useRef<HTMLUListElement>(null);
  const [focusedOption, handleFocus] = useListboxFocus(listRef);

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
  });

  const removeTag = useRef(
    action((tag: Readonly<ClientTag>) => {
      for (const f of fileStore.selection) {
        f.removeTag(tag);
      }
      inputRef.current?.focus();
    }),
  );

  return (
    <div id="tag-editor" ref={panelRef} style={{ height: storedHeight ?? undefined }}>
      <input
        autoFocus
        type="text"
        value={inputText}
        aria-autocomplete="list"
        onChange={handleInput.current}
        onKeyDown={handleFocus}
        className="input"
        aria-controls="tag-files-listbox"
        ref={inputRef}
      />
      <MatchingTagsList
        ref={listRef}
        inputText={inputText}
        counter={counter}
        focusedOption={focusedOption}
        resetTextBox={resetTextBox.current}
      />
      <TagSummary counter={counter} removeTag={removeTag.current} />
    </div>
  );
};

interface MatchingTagsListProps {
  inputText: string;
  counter: IComputedValue<Map<Readonly<ClientTag>, number>>;
  focusedOption: number;
  resetTextBox: () => void;
}

const MatchingTagsList = observer(
  function MatchingTagsList(
    { inputText, counter, focusedOption, resetTextBox }: MatchingTagsListProps,
    ref: ForwardedRef<HTMLUListElement>,
  ) {
    const { fileStore, tagStore } = useStore();

    const matches = useMemo(
      () =>
        computed(() => {
          if (inputText.length === 0) {
            return tagStore.tagList;
          } else {
            const textLower = inputText.toLowerCase();
            return tagStore.tagList.filter(action((t) => t.name.toLowerCase().includes(textLower)));
          }
        }),
      [inputText, tagStore],
    );

    const toggleSelection = useRef(
      action((isSelected: boolean, tag: Readonly<ClientTag>) => {
        const operation = isSelected
          ? (f: Readonly<ClientFile>) => f.removeTag(tag)
          : (f: Readonly<ClientFile>) => f.addTag(tag);

        for (const f of fileStore.selection) {
          operation(f);
        }
        resetTextBox();
      }),
    );

    return (
      <Listbox ref={ref} id="tag-files-listbox" multiselectable>
        {matches.get().map((tag, index) => {
          const selected = counter.get().get(tag) !== undefined;
          return (
            <Option
              key={tag.id}
              value={tag.name}
              selected={selected}
              icon={<span style={{ color: tag.viewColor }}>{IconSet.TAG}</span>}
              onClick={() => toggleSelection.current(selected, tag)}
              focused={focusedOption === index}
            />
          );
        })}
        <CreateOption
          inputText={inputText}
          hasMatches={matches.get().length > 0}
          isFocused={focusedOption === matches.get().length}
          resetTextBox={resetTextBox}
        />
      </Listbox>
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
  const { fileStore, tagStore } = useStore();

  const removeTag = useRef(
    action(async () => {
      const newTag = await tagStore.create(tagStore.root, inputText);
      for (const f of fileStore.selection) {
        f.addTag(newTag);
      }
      resetTextBox();
    }),
  );

  if (inputText.length === 0) {
    return null;
  }

  return (
    <>
      {hasMatches && <MenuDivider />}
      <Option
        selected={false}
        value={`Create Tag "${inputText}"`}
        onClick={removeTag.current}
        icon={IconSet.TAG_ADD}
        focused={isFocused}
      />
    </>
  );
};

interface TagSummaryProps {
  counter: IComputedValue<Map<Readonly<ClientTag>, number>>;
  removeTag: (tag: Readonly<ClientTag>) => void;
}

const TagSummary = observer(({ counter, removeTag }: TagSummaryProps) => {
  const { fileStore } = useStore();

  const sortedTags: Readonly<ClientTag>[] = Array.from(counter.get().entries())
    // Sort based on count
    .sort((a, b) => b[1] - a[1])
    .map((pair) => pair[0]);

  return (
    <div>
      {sortedTags.map((t) => (
        <Tag
          key={t.id}
          text={`${t.name}${fileStore.selection.size > 1 ? ` (${counter.get().get(t)})` : ''}`}
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
    }
  });

  const handleClose = useRef((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      uiStore.closeToolbarTagPopover();
    }
  });

  return (
    // FIXME: data attributes placeholder
    <div
      data-popover
      data-open={uiStore.isToolbarTagPopoverOpen}
      className="floating-dialog"
      onBlur={handleBlur.current}
      onKeyDown={handleClose.current}
    >
      {uiStore.isToolbarTagPopoverOpen ? children : null}
    </div>
  );
});
