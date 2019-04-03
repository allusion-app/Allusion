import React, { useEffect, useState } from 'react';
import fs from 'fs';

import { ClientFile } from '../../entities/File';
import { observer } from 'mobx-react-lite';

const formatDate = (d: Date) =>
  `${d.getUTCFullYear()}-${d.getUTCMonth() +
    1}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}`;

interface IFileInfoProps {
  files: ClientFile[];
}

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
    <section className="fileInfo">
      {fileInfoList.map(({ key, value }) => [
        <div key={`fileInfoKey-${key}`} className="inpectorHeading">
          {key}
        </div>,
        <div key={`fileInfoValue-${key}`} className="fileInfoValue">
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
      <div>Selected {files.length} files</div>
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
