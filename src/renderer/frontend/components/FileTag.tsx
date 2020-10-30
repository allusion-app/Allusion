import React, { useContext } from 'react';
import { ClientTag } from '../../entities/Tag';
import { ClientFile } from '../../entities/File';
import { observer } from 'mobx-react-lite';
import { MultiTagSelector } from './MultiTagSelector';
import StoreContext from '../contexts/StoreContext';
import { action } from 'mobx';
import UiStore from '../stores/UiStore';
import TagStore from '../stores/TagStore';

interface IFileTagProp {
  tagStore: TagStore;
  uiStore: UiStore;
}

const Single = observer(({ tagStore, uiStore }: IFileTagProp) => {
  const file = uiStore.fileSelection.values().next().value as ClientFile;

  const handleCreate = async (name: string) => tagStore.create(tagStore.root, name);

  return (
    <MultiTagSelector
      disabled={file.isBroken}
      selection={Array.from(file.tags)}
      onClear={file.clearTags}
      onDeselect={file.removeTag}
      onSelect={file.addTag}
      onCreate={handleCreate}
    />
  );
});

const Multi = observer(({ tagStore, uiStore: { fileSelection: files } }: IFileTagProp) => {
  // Count how often tags are used
  const countMap = new Map<ClientTag, number>();
  for (const file of files) {
    for (const tag of file.tags) {
      const count = countMap.get(tag);
      countMap.set(tag, count !== undefined ? count + 1 : 1);
    }
  }

  const selection = (() =>
    Array.from(countMap.entries())
      // Sort based on count
      .sort((a, b) => b[1] - a[1])
      .map((pair) => pair[0]))();

  const tagLabel = action((tag: ClientTag) => {
    const count = countMap.get(tag);
    return `${tag.name} (${count})`;
  });

  const handleCreate = async (name: string) => tagStore.create(tagStore.root, name);

  return (
    <MultiTagSelector
      selection={selection}
      onClear={() => files.forEach((f) => f.clearTags())}
      onDeselect={(tag) => files.forEach((f) => f.removeTag(tag))}
      onSelect={(tag) => files.forEach((f) => f.addTag(tag))}
      tagLabel={tagLabel}
      onCreate={handleCreate}
    />
  );
});

const FileTags = observer(() => {
  const { uiStore, tagStore } = useContext(StoreContext);
  return (
    <div className="file-tag">
      {uiStore.fileSelection.size === 1 ? (
        <Single tagStore={tagStore} uiStore={uiStore} />
      ) : (
        <Multi tagStore={tagStore} uiStore={uiStore} />
      )}
    </div>
  );
});

export default FileTags;
