import React, { useEffect, useState } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';
import { promisify } from 'util';
import { imageSize } from 'image-size';
const sizeOf = promisify(imageSize);

interface IImageInfo {
  /** This is used to avoid fetching twice in DelayedGalleryItem component! */
  suspended?: boolean;
  file: ClientFile;
}

const ImageInfo = observer(({ suspended = false, file }: IImageInfo) => {
  const [fileStats, setFileStats] = useState({
    imported: formatDateTime(file.dateAdded),
    created: '...',
    modified: '...',
    lastOpened: '...',
    dimensions: '...',
    // { key: 'Resolution', value: '?' },
    // { key: 'Color Space', value: '?' },
  });

  useEffect(() => {
    if (suspended) {
      return;
    }
    let isMounted = true;
    Promise.all([fse.stat(file.absolutePath), sizeOf(file.absolutePath)])
      .then(([stats, dimensions]) => {
        if (isMounted) {
          setFileStats((s) => ({
            ...s,
            created: formatDateTime(file.dateCreated),
            modified: formatDateTime(stats.ctime),
            lastOpened: formatDateTime(stats.atime),
            dimensions:
              dimensions !== undefined ? `${dimensions.width} x ${dimensions.height}` : '...',
          }));
        }
      })
      .catch(() => {
        if (isMounted) {
          setFileStats((s) => ({
            ...s,
            created: '...',
            modified: '...',
            lastOpened: '...',
            dimensions: '...',
          }));
        }
      });

    return () => {
      isMounted = false;
    };
  }, [file, suspended]);

  // Todo: Would be nice to also add tooltips explaining what these mean (e.g. diff between dimensions & resolution)
  // Or add the units: pixels vs DPI
  return (
    <div className="file-info">
      <span>Filename</span>
      <span>{file.name}</span>
      <span>Imported</span>
      <span>{fileStats.imported}</span>
      <span>Created</span>
      <span>{fileStats.created}</span>
      <span>Modified</span>
      <span>{fileStats.modified}</span>
      <span>Last Opened</span>
      <span>{fileStats.lastOpened}</span>
      <span>Dimensions</span>
      <span>{fileStats.dimensions}</span>
    </div>
  );
});

export default ImageInfo;
