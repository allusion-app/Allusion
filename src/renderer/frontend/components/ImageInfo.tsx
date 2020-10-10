import React, { useEffect, useState, useMemo } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';

const ImageInfo = observer(({ file }: { file: ClientFile }) => {
  const [fileStats, setFileStats] = useState<fse.Stats | undefined>(undefined);
  const [resolution, setResolution] = useState<string>('...');

  // Look up file info when file changes
  useEffect(() => {
    let isMounted = true;
    fse
      .stat(file.absolutePath)
      .then((stats) => isMounted && setFileStats(stats))
      .catch(() => isMounted && setFileStats(undefined));
    const img = new Image();

    img.onload = () => {
      if (isMounted) {
        setResolution(`${img.width} x ${img.height}`);
      }
    };
    img.src = file.absolutePath;
    return () => {
      isMounted = false;
    };
  }, [file, file.absolutePath]);

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
        value: fileStats ? formatDateTime(file.dateCreated) : '...',
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
    <div className="file-info">
      {fileInfoList.map(({ key, value }) => [
        <span key={key} className="file-info-key">
          {key}
        </span>,
        <span key={`v-${key}`} className="file-info-value">
          {value}
        </span>,
      ])}
    </div>
  );
});

export default ImageInfo;
