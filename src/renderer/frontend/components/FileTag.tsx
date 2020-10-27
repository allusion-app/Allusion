import React, { useContext } from 'react';
import { ClientTag } from '../../entities/Tag';
import { ClientFile } from '../../entities/File';
import { observer } from 'mobx-react-lite';
import { MultiTagSelector } from './MultiTagSelector';
import StoreContext from '../contexts/StoreContext';
import { action } from 'mobx';

const Single = observer(({ file }: { file: ClientFile }) => {
  const { tagStore } = useContext(StoreContext);

  const handleCreate = async (name: string) => tagStore.create(tagStore.root, name);

  return (
    <MultiTagSelector
      disabled={file.isBroken}
      selection={file.clientTags}
      onClear={file.clearTags}
      onDeselect={(tag) => file.removeTag(tag.id)}
      onSelect={(tag) => file.addTag(tag.id)}
      onCreate={handleCreate}
    />
  );
});

const Multi = observer(({ files }: { files: ClientFile[] }) => {
  const { tagStore } = useContext(StoreContext);

  // Count how often tags are used
  const combinedTags: ClientTag[] = files.flatMap((f) => f.clientTags);
  const countMap = new Map<ClientTag, number>();
  combinedTags.forEach((t) => countMap.set(t, (countMap.get(t) || 0) + 1));

  // Sort based on count
  const sortedTags = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);

  const tagLabel = action((tag: ClientTag) => {
    const match = sortedTags.find((pair) => pair[0] === tag);
    return `${tag.name} (${match ? match[1] : '?'})`;
  });

  const handleCreate = async (name: string) => tagStore.create(tagStore.root, name);

  return (
    <MultiTagSelector
      selection={sortedTags.map((pair) => pair[0])}
      onClear={() => files.forEach((f) => f.clearTags())}
      onDeselect={(tag) => files.forEach((f) => f.removeTag(tag.id))}
      onSelect={(tag) => files.forEach((f) => f.addTag(tag.id))}
      tagLabel={tagLabel}
      onCreate={handleCreate}
    />
  );
});

const FileTags = observer(({ files }: { files: ClientFile[] }) => {
  return (
    <div className="file-tag">
      {files.length === 1 ? <Single file={files[0]} /> : <Multi files={files} />}
    </div>
  );
});

export default FileTags;
