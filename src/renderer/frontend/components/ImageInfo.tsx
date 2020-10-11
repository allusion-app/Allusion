import React, { useEffect, useState } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';

const ImageInfo = observer(({ file }: { file: ClientFile }) => {
  const [fileStats, setFileStats] = useState({
    created: '...',
    modified: '...',
    lastOpened: '...',
    // { key: 'Resolution', value: '?' },
    // { key: 'Color Space', value: '?' },
  });
  const [resolution, setResolution] = useState<string>('...');

  // Look up file info when file changes
  useEffect(() => {
    let isMounted = true;
    fse
      .stat(file.absolutePath)
      .then((stats) => {
        if (isMounted) {
          setFileStats({
            created: formatDateTime(file.dateCreated),
            modified: formatDateTime(stats.ctime),
            lastOpened: formatDateTime(stats.atime),
          });
        }
      })
      .catch(() => {
        if (isMounted) {
          setFileStats({ created: '...', modified: '...', lastOpened: '...' });
        }
      });
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
  }, [file.absolutePath, file.dateCreated]);

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  return (
    <div className="file-info">
      <span className="file-info-key">Filename</span>
      <span className="file-info-value">{file.name}</span>
      <span className="file-info-key">Imported</span>
      <span className="file-info-value">{formatDateTime(file.dateAdded)}</span>
      <span className="file-info-key">Created</span>
      <span className="file-info-value">{fileStats.created}</span>
      <span className="file-info-key">Modified</span>
      <span className="file-info-value">{fileStats.modified}</span>
      <span className="file-info-key">Last Opened</span>
      <span className="file-info-value">{fileStats.lastOpened}</span>
      <span className="file-info-key">Dimensions</span>
      <span className="file-info-value">{resolution}</span>
    </div>
  );
});

export default ImageInfo;
