import React, { useEffect, useState } from 'react';
import fse from 'fs-extra';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';
import { promisify } from 'util';
import { imageSize } from 'image-size';
const sizeOf = promisify(imageSize);

interface IImageInfo {
  /** This is used to avoid making sys calls while the user is scrolling! */
  suspended?: boolean;
  file: ClientFile;
}

const ImageInfo = ({ suspended = false, file }: IImageInfo) => {
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
    <table className="file-info">
      <tbody>
        <tr>
          <th scope="row">Dimensions</th>
          <td>{fileStats.dimensions}</td>
        </tr>
        <tr>
          <th scope="row">Filename</th>
          <td>{file.name}</td>
        </tr>
        <tr>
          <th scope="row">Imported</th>
          <td>{fileStats.imported}</td>
        </tr>
        <tr>
          <th scope="row">Created</th>
          <td>{fileStats.created}</td>
        </tr>
        <tr>
          <th scope="row">Modified</th>
          <td>{fileStats.modified}</td>
        </tr>
        <tr>
          <th scope="row">Last Opened</th>
          <td>{fileStats.lastOpened}</td>
        </tr>
      </tbody>
    </table>
  );
};

export default React.memo(ImageInfo);
