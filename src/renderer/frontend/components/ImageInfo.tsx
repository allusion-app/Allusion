import React, { useEffect, useState, useMemo, useRef } from 'react';
import fs from 'fs';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';

const ImageInfo = observer(({ file }: { file: ClientFile }) => {
  const isMounted = useRef(false);
  const [fileStats, setFileStats] = useState<fs.Stats | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [resolution, setResolution] = useState<string>('...');

  // Look up file info when file changes
  useEffect(
    () => {
      isMounted.current = true;
      fs.stat(file.absolutePath, (err, stats) => {
        if (isMounted.current) {
          err ? setError(err) : setFileStats(stats);
        }
      });
      const img = new Image();

      img.onload = () => {
        if (isMounted.current) {
          setResolution(`${img.width}x${img.height}`);
        }
      };
      img.src = file.absolutePath;
      return () => {
        isMounted.current = false;
      };
    },
    [file.absolutePath],
  );

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  const fileInfoList = useMemo(
    () => [
      { key: 'Filename', value: file.name },
      {
        key: 'Imported',
        value: formatDateTime(file.dateAdded),
      },
      {
        key: 'Created',
        value: fileStats ? formatDateTime(fileStats.birthtime) : '...',
      },
      { key: 'Modified', value: fileStats ? formatDateTime(fileStats.ctime) : '...' },
      {
        key: 'Last Opened',
        value: fileStats ? formatDateTime(fileStats.atime) : '...',
      },
      { key: 'Dimensions', value: resolution },
      // { key: 'Resolution', value: '?' },
      // { key: 'Color Space', value: '?' },
    ],
    [file, fileStats, resolution],
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

export default ImageInfo;
