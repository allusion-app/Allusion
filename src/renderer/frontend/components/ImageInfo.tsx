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
    <section className="file-info">
      {fileInfoList.map(({ key, value }) => [
        <small key={`key-${key}`} className="file-info-key bp3-label">
          {key}
        </small>,
        <div key={`value-${key}`} className="file-info-value bp3-button-text">
          {value || '-'}
        </div>,
      ])}
    </section>
  );
});

export default ImageInfo;
