import React, { useEffect, useState, useMemo } from 'react';
import fs from 'fs';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';

const formatDate = (d: Date) =>
  `${d.getUTCFullYear()}-${d.getUTCMonth() +
    1}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}`;

interface IFileInfoProps {
  files: ClientFile[];
}

export const SingleFileInfo = observer(({ file }: { file: ClientFile }) => {
  const [fileStats, setFileStats] = useState<fs.Stats | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [resolution, setResolution] = useState<string>('...');

  // Look up file info when file changes
  useEffect(
    () => {
      fs.stat(file.path, (err, stats) =>
        err ? setError(err) : setFileStats(stats),
      );
      const img = new Image();
      img.src = file.path;
      img.onload = () => {
        setResolution(`${img.width}x${img.height}`);
      };

      return () => {
        if (resolution === '...') {
          img.src = '';
          img.onload = () => {}; // tslint:disable-line: no-empty
        }
      };
    },
    [file],
  );

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  const fileInfoList = useMemo(
    () => [
      { key: 'Filename', value: file.name },
      {
        key: 'Created',
        value: fileStats ? formatDate(fileStats.birthtime) : '...',
      },
      { key: 'Modified', value: fileStats ? formatDate(fileStats.ctime) : '...' },
      {
        key: 'Last Opened',
        value: fileStats ? formatDate(fileStats.atime) : '...',
      },
      { key: 'Dimensions', value: resolution },
      // { key: 'Resolution', value: '?' },
      // { key: 'Color Space', value: '?' },
    ],
    [file, fileStats],
  );

  return (
    <section id="fileInfo">
      {fileInfoList.map(({ key, value }) => [
        <small key={`fileInfoKey-${key}`} className="bp3-label">
          {key}
        </small>,
        <div key={`fileInfoValue-${key}`} className="fileInfoValue bp3-button-text">
          {value}
        </div>,
      ])}

      {error && (
        <p>
          Error: {error.name} <br /> {error.message}
        </p>
      )}
    </section>
  );
});

const MultiFileInfo = observer(({ files }: IFileInfoProps) => {
  return (
    <section>
      <p>Selected {files.length} files</p>
    </section>
  );
});

const FileInfo = ({ files }: IFileInfoProps) => {
  if (files.length === 1) {
    return <SingleFileInfo file={files[0]} />;
  } else {
    return <MultiFileInfo files={files} />;
  }
};

export default FileInfo;
