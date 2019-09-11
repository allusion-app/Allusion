import React, { useEffect, useState, useMemo, useRef } from 'react';
import fs from 'fs';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';

// const formatDate = (d: Date) =>
//   `${d.getUTCFullYear()}-${d.getUTCMonth() +
//     1}-${d.getUTCDate()} ${d.getUTCHours()}:${d.getUTCMinutes()}`;

const DateTimeFormat = new Intl.DateTimeFormat(undefined, {
  timeZone: 'UTC',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
});

const formatDateTime = (d: Date) => {
  return DateTimeFormat.formatToParts(d).map(({type, value}) => { 
    if (type === 'literal' && value === ', ') {
      return ' ';
    } 
    return value;
  }).reduce((string, part) => string + part);
};

const ImageInfo = observer(({ file }: { file: ClientFile }) => {
  const isMounted = useRef(false);
  const [fileStats, setFileStats] = useState<fs.Stats | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [resolution, setResolution] = useState<string>('...');

  // Look up file info when file changes
  useEffect(
    () => {
      isMounted.current = true;
      fs.stat(file.path, (err, stats) => {
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
      img.src = file.path;
      return () => {
        isMounted.current = false;
      };
    },
    [file.path],
  );

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  const fileInfoList = useMemo(
    () => [
      { key: 'Filename', value: file.name },
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
