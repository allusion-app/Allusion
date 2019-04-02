import React, { useEffect, useState, useCallback } from 'react';
import fs from 'fs';

import { ClientFile } from '../../entities/File';
import { Tag } from '@blueprintjs/core';
import { observer } from 'mobx-react-lite';
import { ClientTag } from '../../entities/Tag';
import MultiTagSelector from './MultiTagSelector';

const formatDate = (d: Date) =>
  `${d.getUTCFullYear()}-${d.getUTCMonth() +
    1}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}`;

const SingleFileInfo = observer(({ file }: { file: ClientFile }) => {
  const [fileStats, setFileStats] = useState<fs.Stats | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);

  // Look up file info when component mounts
  useEffect(() => {
    fs.stat(file.path, (err, stats) =>
      err ? setError(err) : setFileStats(stats),
    );
  }, []);

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  const fileInfoList = [
    { key: 'Filename', value: file.path },
    {
      key: 'Created',
      value: fileStats ? formatDate(fileStats.birthtime) : '...',
    },
    { key: 'Modified', value: fileStats ? formatDate(fileStats.ctime) : '...' },
    {
      key: 'Last Opened',
      value: fileStats ? formatDate(fileStats.atime) : '...',
    },
    { key: 'Dimensions', value: '?' },
    { key: 'Resolution', value: '?' },
    { key: 'Color Space', value: '?' },
  ];

  return (
    <>
      {fileInfoList.map(({ key, value }, index) => (
        <div key={`fileInfoIndex-${index}`}>
          <div className="fileInfoKey">{key}</div>
          <div className="fileInfoValue">{value}</div>
        </div>
      ))}
      <div>
        <div className="fileInfoKey fileInfoKeyMulti">Tags</div>
        <div>
          <MultiTagSelector
            selectedTags={file.clientTags}
            onClearSelection={() => file.tags.clear()}
            onTagDeselect={(index) => file.tags.splice(index, 1)}
            onTagSelect={(tag) => file.tags.push(tag.id)}
          />
        </div>
      </div>
      {error && (
        <p>
          Error: {error.name} <br /> {error.message}
        </p>
      )}
    </>
  );
});

const MultiFileInfo = observer(({ files }: IFileInfoProps) => {
  // Count how often tags are used
  const allTags: ClientTag[] = [];
  files.forEach((f) => allTags.push(...f.clientTags));
  const countMap = new Map<ClientTag, number>();
  allTags.forEach((t) => countMap.set(t, (countMap.get(t) || 0) + 1));

  // Sort based on count
  // tslint:disable-next-line: newline-per-chained-call
  const sortedTags = Array.from(countMap.entries()).sort((a, b) => b[1] - a[1]);

  const handleClear = useCallback(() => files.forEach((f) => f.tags.clear()), [files]);
  const handleSelect = useCallback((tag: ClientTag) => files.forEach((f) => f.tags.push(tag.id)), [files]);
  const handleDeselect = useCallback((index: number) => {
    const removedTag = sortedTags[index][0];
    files.forEach((f) => f.tags.remove(removedTag.id));
  }, [files]);

  return (
    <>
      <p>Selected {files.length} files</p>
      <div>
        <div className="fileInfoKey fileInfoKeyMulti">Tags</div>
        <div>
          {sortedTags.map(([tag, count], i) => (
            <Tag key={`tag-${i}`} onRemove={() => console.log('Remove tag')}>
              {tag.name} ({count})
            </Tag>
          ))}

          <MultiTagSelector
            selectedTags={sortedTags.map((pair) => pair[0])}
            onClearSelection={handleClear}
            onTagDeselect={handleDeselect}
            onTagSelect={handleSelect}
            tagLabel={(tag) => {
              const match = sortedTags.find((pair) => pair[0] === tag);
              return `${tag.name} (${match ? match[1] : '?'})`;
            }
            }
          />
        </div>
      </div>
    </>
  );
});

interface IFileInfoProps {
  files: ClientFile[];
}

const FileInfo = ({ files }: IFileInfoProps) => {
  if (files.length === 0) {
    return <br />;
  } else if (files.length === 1) {
    return <SingleFileInfo file={files[0]} />;
  } else {
    return <MultiFileInfo files={files} />;
  }
};

export default FileInfo;
