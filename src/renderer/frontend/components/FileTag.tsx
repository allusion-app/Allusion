import React, { useCallback, useContext } from 'react';
import { ClientTag } from '../../entities/Tag';
import { ClientFile } from '../../entities/File';
import { observer } from 'mobx-react-lite';
import MultiTagSelector from './MultiTagSelector';
import StoreContext from '../contexts/StoreContext';

interface IFileTagProps {
  files: ClientFile[];
}

const Single = observer(({ file }: { file: ClientFile }) => {
  const { tagStore } = useContext(StoreContext);

  const handleClear = useCallback(
    () => file.tags.clear(),
    [file],
  );

  const handleDeselect = useCallback(
    (index) => file.tags.splice(index, 1),
    [file],
  );

  const handleSelect = useCallback(
    (tag) => file.tags.push(tag.id),
    [file],
  );

  const handleCreate = useCallback(
    (name: string) => {
      const newTag = tagStore.addTag(name);
      // Todo: When merging with hierarchy, make sure to this tag to a collection
      return newTag;
    },
    [file],
  );

  return (
    <MultiTagSelector
      selectedTags={file.clientTags}
      onClearSelection={handleClear}
      onTagDeselect={handleDeselect}
      onTagSelect={handleSelect}
      onTagCreation={handleCreate}
    />
  );
});

const Multi = observer(({ files }: IFileTagProps) => {
  const { tagStore } = useContext(StoreContext);

  // Count how often tags are used
  const combinedTags: ClientTag[] = [];
  files.forEach((f) => combinedTags.push(...f.clientTags));
  const countMap = new Map<ClientTag, number>();
  combinedTags.forEach((t) => countMap.set(t, (countMap.get(t) || 0) + 1));

  // Sort based on count
  // tslint:disable-next-line: newline-per-chained-call
  const sortedTags = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);

  const handleClear = useCallback(
    () => files.forEach((f) => f.tags.clear()),
    [files],
  );

  const handleSelect = useCallback(
    (tag: ClientTag) => files.forEach((f) => f.tags.push(tag.id)),
    [files],
  );

  const handleDeselect = useCallback(
    (index: number) => {
      const removedTag = sortedTags[index][0];
      files.forEach((f) => f.tags.remove(removedTag.id));
    },
    [files, sortedTags],
  );

  const tagLabel = useCallback(
    (tag: ClientTag) => {
      const match = sortedTags.find((pair) => pair[0] === tag);
      return `${tag.name} (${match ? match[1] : '?'})`;
    },
    [sortedTags],
  );

  const handleCreate = useCallback(
    (name: string) => {
      const newTag = tagStore.addTag(name);
      files.forEach((file) => file.addTag(newTag.id));
      return newTag;
    },
    [files],
  );

  return (
    <MultiTagSelector
      selectedTags={sortedTags.map((pair) => pair[0])}
      onClearSelection={handleClear}
      onTagDeselect={handleDeselect}
      onTagSelect={handleSelect}
      tagLabel={tagLabel}
      onTagCreation={handleCreate}
    />
  );
});

const FileTag = ({ files }: IFileTagProps) => {
  return (
    <section className="fileTag">
      <div className="inpectorHeading">Tags</div>
      {files.length === 1 ? (
        <Single file={files[0]} />
      ) : (
        <Multi files={files} />
      )}
    </section>
  );
};

export default FileTag;
