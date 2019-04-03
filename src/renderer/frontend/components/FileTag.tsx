import React from 'react';
import { Tag } from '@blueprintjs/core';
import { ClientTag } from '../../entities/Tag';
import { ClientFile } from '../../entities/File';
import { observer } from 'mobx-react-lite';

interface IFileTagProps {
  files: ClientFile[];
}

const Single = observer(({ file }: { file: ClientFile }) => {
  const tags = file.clientTags;
  return (
    <div>
      {tags.map((tag) => (
        <Tag
          key={`inspector-tag-${tag.id}`}
          onRemove={() => file.removeTag(tag.id)}>
          {tag.name}
        </Tag>
      ))}
    </div>
  );
});

const Multi = observer(({ files }: IFileTagProps) => {
  const tags = files.flatMap((f) => f.clientTags);
  const countMap = new Map<ClientTag, number>();
  tags.forEach((t) => countMap.set(t, (countMap.get(t) || 0) + 1));
  // tslint:disable-next-line: newline-per-chained-call
  const sortedTags = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);
  return (
    <div>
      {sortedTags.map(([tag, count]) => (
        <Tag
          key={`inspector-tag-${tag.id}`}
          onRemove={() => files.forEach((f) => f.removeTag(tag.id))}>
          {tag.name} ({count})
        </Tag>
      ))}
    </div>
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
