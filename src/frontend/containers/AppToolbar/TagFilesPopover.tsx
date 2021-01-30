import React, { ReactNode, useContext, useRef, useState } from 'react';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ClientTag } from 'src/entities/Tag';

import StoreContext from '../../contexts/StoreContext';

import { IconSet } from 'widgets/Icons';
import { ToolbarButton } from 'widgets/menus';
import { Tag, Listbox, Option } from 'widgets';

import { countFileTags } from '../../components/FileTag';

import { Tooltip } from './PrimaryCommands';
import UiStore from 'src/frontend/stores/UiStore';
import TagStore from 'src/frontend/stores/TagStore';

const TagFilesPopover = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);

  return (
    <>
      <ToolbarButton
        showLabel="never"
        icon={IconSet.TAG}
        disabled={uiStore.fileSelection.size === 0 && !uiStore.isToolbarTagPopoverOpen}
        onClick={uiStore.toggleToolbarTagPopover}
        text="Tag selected files"
        tooltip={Tooltip.TagFiles}
      />
      <FloatingDialog
        isOpen={uiStore.isToolbarTagPopoverOpen}
        onClose={uiStore.closeToolbarTagPopover}
      >
        <TagFilesWidget uiStore={uiStore} tagStore={tagStore} />
      </FloatingDialog>
    </>
  );
});

export default TagFilesPopover;

interface TagFilesWidgetProps {
  uiStore: UiStore;
  tagStore: TagStore;
}

const TagFilesWidget = observer(({ uiStore, tagStore }: TagFilesWidgetProps) => {
  const [inputText, setInputText] = useState('');
  const files = uiStore.fileSelection;

  const { counter, sortedTags } = countFileTags(files);
  const [matchingTags, setMatchingTags] = useState([...tagStore.tagListWithoutRoot]);

  const inputRef = useRef<HTMLInputElement>(null);

  const onSelect = action((tag: ClientTag) => {
    for (const f of files) {
      f.addTag(tag);
    }
  });

  const onDeselect = action((tag: ClientTag) => {
    for (const f of files) {
      f.removeTag(tag);
    }
  });

  const handleInput = action((e: React.ChangeEvent<HTMLInputElement>) => {
    const text = e.target.value;
    setInputText(e.target.value);

    if (text.length === 0) {
      setMatchingTags([...tagStore.tagListWithoutRoot]);
    } else {
      const textLower = text.toLowerCase();
      const newTagList = tagStore.tagListWithoutRoot.filter((t) =>
        t.name.toLowerCase().includes(textLower),
      );
      setMatchingTags(newTagList);
    }
  });

  const handleCreate = action(async () => {
    const newTag = await tagStore.create(tagStore.root, inputText);
    onSelect(newTag);
    setInputText('');
    setMatchingTags([...tagStore.tagListWithoutRoot]);
    inputRef.current?.focus();
  });

  const handleInputKeyDown = action((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleCreate();
      e.stopPropagation();
    }
  });

  return (
    <div id="tag-editor" onKeyDown={handleKeyDown}>
      <input
        autoFocus
        type="text"
        value={inputText}
        aria-autocomplete="list"
        onChange={handleInput}
        onKeyDown={handleInputKeyDown}
        className="input"
        aria-controls="tag-files-listbox"
        ref={inputRef}
      />
      <Listbox id="tag-files-listbox" multiselectable={true}>
        {matchingTags.map((t) => (
          <Option
            key={t.id}
            value={t.name}
            selected={counter.get(t) !== undefined}
            icon={<span style={{ color: t.viewColor }}>{IconSet.TAG}</span>}
            onClick={() => (counter.get(t) ? onDeselect(t) : onSelect(t))}
          />
        ))}
        {inputText && (
          <Option
            key="create"
            selected={false}
            value={`Create Tag "${inputText}"`}
            onClick={handleCreate}
            icon={IconSet.TAG_ADD}
          />
        )}
      </Listbox>
      <div>
        {sortedTags.map((t) => (
          <Tag
            key={t.id}
            text={`${t.name}${files.size > 1 ? ` (${counter.get(t)})` : ''}`}
            color={t.viewColor}
            onRemove={() => onDeselect(t)}
          />
        ))}
        {sortedTags.length === 0 && <i>No tags added yet</i>}
      </div>
    </div>
  );
});

interface FloatingDialogProps {
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
}

const FloatingDialog = (props: FloatingDialogProps) => {
  const { onClose, isOpen, children } = props;

  const handleBlur = (e: React.FocusEvent) => {
    const button = e.currentTarget.previousElementSibling as HTMLElement;
    if (e.relatedTarget !== button && !e.currentTarget.contains(e.relatedTarget as Node)) {
      onClose();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      onClose();
    }
  };

  return (
    // FIXME: data attributes placeholder
    <div
      data-popover
      data-open={isOpen}
      className="floating-dialog"
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {isOpen ? children : null}
    </div>
  );
};

function handleKeyDown(e: React.KeyboardEvent) {
  const input = e.currentTarget.firstElementChild as HTMLElement;
  const listbox = input.nextElementSibling as HTMLElement;

  switch (e.key) {
    case 'ArrowDown':
      if (listbox.firstElementChild !== null) {
        e.preventDefault(); // FIXME: element.focus({ preventScroll: true}) option not working (Chrome Bug)
        e.stopPropagation();
        (listbox.firstElementChild as HTMLElement).focus();
      }
      break;

    case 'ArrowUp':
      if (listbox.lastElementChild !== null) {
        e.preventDefault(); // FIXME: element.focus({ preventScroll: true}) option not working (Chrome Bug)
        e.stopPropagation();
        (listbox.lastElementChild as HTMLElement).focus();
      }
      break;

    case 'ArrowRight':
      if (e.target !== input) {
        e.stopPropagation();
        input.focus();
      }
      break;

    case 'ArrowLeft':
      if (e.target !== input) {
        e.stopPropagation();
        input.focus();
      }
      break;

    default:
      break;
  }
}
