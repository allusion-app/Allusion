import React, { useContext } from 'react';
import { action, ObservableSet } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ClientFile } from 'src/entities/File';
import { ClientTag } from 'src/entities/Tag';

import StoreContext from '../contexts/StoreContext';
import TagStore from '../stores/TagStore';
import UiStore from '../stores/UiStore';

import { MultiTagSelector } from './MultiTagSelector';
import { IconSet } from 'widgets/Icons';

interface IFileTagProp {
  tagStore: TagStore;
  uiStore: UiStore;
}

const Single = observer(({ tagStore, uiStore }: IFileTagProp) => {
  const file = uiStore.firstSelectedFile;

  if (file === undefined) {
    throw new Error('BUG: No file was selected. A condition was not checked.');
  }

  const handleCreate = async (name: string) => tagStore.create(tagStore.root, name);

  return (
    <MultiTagSelector
      disabled={file.isBroken}
      selection={Array.from(file.tags)}
      onClear={file.clearTags}
      onDeselect={file.removeTag}
      onSelect={file.addTag}
      extraOptions={[
        {
          id: 'create',
          icon: IconSet.TAG_ADD,
          label: (input: string) => `Create tag "${input}"`,
          action: handleCreate,
          resetQueryOnAction: true,
        },
      ]}
    />
  );
});

const Multi = observer(({ tagStore, uiStore: { fileSelection: files } }: IFileTagProp) => {
  const { counter, sortedTags } = countFileTags(files);

  const tagLabel = action((tag: ClientTag) => `${tag.name} (${counter.get(tag)})`);

  const handleCreate = (name: string) => tagStore.create(tagStore.root, name);

  return (
    <MultiTagSelector
      selection={sortedTags}
      onClear={action(() => files.forEach((f) => f.clearTags()))}
      onDeselect={action((tag) => files.forEach((f) => f.removeTag(tag)))}
      onSelect={action((tag) => files.forEach((f) => f.addTag(tag)))}
      tagLabel={tagLabel}
      extraOptions={[
        {
          id: 'create',
          icon: IconSet.TAG_ADD,
          label: (input: string) => `Create tag "${input}"`,
          action: handleCreate,
          resetQueryOnAction: true,
          onlyShowWithoutSuggestions: true,
        },
      ]}
    />
  );
});

const FileTags = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);
  if (uiStore.fileSelection.size === 1) {
    return <Single tagStore={tagStore} uiStore={uiStore} />;
  } else {
    return <Multi tagStore={tagStore} uiStore={uiStore} />;
  }
});

export default FileTags;

export function countFileTags(files: ObservableSet<ClientFile>) {
  // Count how often tags are used
  const counter = new Map<ClientTag, number>();
  for (const file of files) {
    for (const tag of file.tags) {
      const count = counter.get(tag);
      counter.set(tag, count !== undefined ? count + 1 : 1);
    }
  }

  const sortedTags = Array.from(counter.entries())
    // Sort based on count
    .sort((a, b) => b[1] - a[1])
    .map((pair) => pair[0]);

  return { counter, sortedTags };
}
