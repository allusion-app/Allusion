import React, { useEffect, useState } from 'react';
import fs from 'fs';

import { ClientFile } from '../../entities/File';

const formatDate = (d: Date) => (
  `${d.getUTCFullYear()}-${d.getUTCMonth() + 1}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}`
);

const SingleFileInfo = ({ file }: { file: ClientFile }) => {
  const [fileStats, setFileStats] = useState<fs.Stats | undefined>(undefined);
  const [error, setError] = useState<Error>(undefined);

  // Look up file info when component mounts
  useEffect(() => {
    fs.stat(file.path, (err, stats) => err ? setError(err) : setFileStats(stats));
  }, []);

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  const fileInfoList = [
    { key: 'Filename', value: file.path },
    { key: 'Tags', value: file.clientTags.map((t) => t.name).join(', ') },
    { key: 'Created', value: fileStats ? formatDate(fileStats.birthtime) : '...' },
    { key: 'Modified', value: fileStats ? formatDate(fileStats.ctime) : '...' },
    { key: 'Last Opened', value: fileStats ? formatDate(fileStats.atime) : '...' },
    { key: 'Dimensions', value: '?' },
    { key: 'Resolution', value: '?' },
    { key: 'Color Space', value: '?' },
  ];

  return (
    <>
      {fileInfoList.map(
        ({ key, value }, index) => (
          <div key={`fileInfoIndex-${index}`}>
            <div className="fileInfoKey">{key}</div>
            <div className="fileInfoValue">{value}</div>
          </div>
        ),
      )}
      {error && <p>Error: {error.name} <br /> {error.message}</p>}
    </>
  );
};

const MultiFileInfo = ({ files }: IFileInfoProps) => (
  <>
    <p>Selected {files.length} files</p>
    <p>Tags: (Put tags of all files here with a counter and a remove button?)</p>
    <p>Total file size: ...</p>
    <p>File types: ...</p>
  </>
);


interface IFileInfoProps {
  files: ClientFile[];
}

const FileInfo = ({
  files,
}: IFileInfoProps) => {

  if (files.length === 0) {
    return (
      <p>No file selected</p>
    );
  } else if (files.length === 1) {
    return <SingleFileInfo file={files[0]} />;
  } else {
    return <MultiFileInfo files={files} />;
  }
};

export default FileInfo;
