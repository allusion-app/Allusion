import React, { useContext } from 'react';
import { ClientTag } from '../../entities/Tag';
import { ClientFile } from '../../entities/File';
import { observer } from 'mobx-react-lite';
import MultiTagSelector from './MultiTagSelector';
import StoreContext from '../contexts/StoreContext';
import { ClientTagCollection } from '../../entities/TagCollection';

interface IFileTagProps {
  files: ClientFile[];
  autoFocus?: boolean;
}

const Single = observer(({ file, autoFocus }: { file: ClientFile; autoFocus?: boolean }) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);

  const handleCreate = async (name: string) => {
    const tag = await tagStore.addTag(name);
    // Add new tags to the root hierarchy by default
    tagCollectionStore.getRootCollection().addTag(tag.id);
    return tag;
  };

  return (
    <MultiTagSelector
      disabled={file.isBroken}
      selectedItems={file.clientTags}
      onClearSelection={file.removeAllTags}
      onTagDeselect={(tag) => file.removeTag(tag.id)}
      onTagSelect={(tag) => file.addTag(tag.id)}
      onTagCreation={handleCreate}
      autoFocus={autoFocus}
      refocusObject={file}
    />
  );
});

const Multi = observer(({ files, autoFocus }: IFileTagProps) => {
  const { tagStore, tagCollectionStore } = useContext(StoreContext);

  // Count how often tags are used
  const combinedTags: ClientTag[] = files.flatMap((f) => f.clientTags);
  const countMap = new Map<ClientTag, number>();
  combinedTags.forEach((t) => countMap.set(t, (countMap.get(t) || 0) + 1));

  // Sort based on count
  const sortedTags = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);

  const tagLabel = (tag: ClientTag | ClientTagCollection) => {
    const match = sortedTags.find((pair) => pair[0] === tag);
    return `${tag.name} (${match ? match[1] : '?'})`;
  };

  const handleCreate = async (name: string) => {
    const newTag = await tagStore.addTag(name);
    // Add new tags to the root hierarchy by default
    tagCollectionStore.getRootCollection().addTag(newTag.id);
    return newTag;
  };

  return (
    <MultiTagSelector
      selectedItems={sortedTags.map((pair) => pair[0])}
      onClearSelection={() => files.forEach((f) => f.removeAllTags())}
      onTagDeselect={(tag) => files.forEach((f) => f.removeTag(tag.id))}
      onTagSelect={(tag) => files.forEach((f) => f.addTag(tag.id))}
      tagLabel={tagLabel}
      onTagCreation={handleCreate}
      autoFocus={autoFocus}
      refocusObject={files.length}
    />
  );
});

const FileTags = ({ files, autoFocus = false }: IFileTagProps) => {
  return (
    <section className="file-tag">
      <h4 className="bp3-heading inpectorHeading">Tags</h4>
      {files.length === 1 ? (
        <Single file={files[0]} autoFocus={autoFocus} />
      ) : (
        <Multi files={files} autoFocus={autoFocus} />
      )}
    </section>
  );
};

export default FileTags;
