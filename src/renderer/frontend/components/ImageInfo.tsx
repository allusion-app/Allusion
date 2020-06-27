import React, { useEffect, useState, useMemo } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';
import { Callout, NonIdealState, ButtonGroup, Button } from '@blueprintjs/core';
import IconSet from 'components/Icons';

const ImageInfo = observer(({ file }: { file: ClientFile }) => {
  const [fileStats, setFileStats] = useState<fse.Stats | undefined>(undefined);
  const [error, setError] = useState<Error | undefined>(undefined);
  const [resolution, setResolution] = useState<string>('...');

  // Look up file info when file changes
  useEffect(() => {
    let isMounted = true;
    fse
      .stat(file.absolutePath)
      .then((stats) => isMounted && setFileStats(stats))
      .catch((err) => setError(err));
    const img = new Image();

    img.onload = () => {
      if (isMounted) {
        setResolution(`${img.width}x${img.height}`);
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
    <>
      <section id="fileInfo">
        {fileInfoList.map(({ key, value }) => [
          <small key={`fileInfoKey-${key}`} className="bp3-label">
            {key}
          </small>,
          <div key={`fileInfoValue-${key}`} className="fileInfoValue bp3-button-text">
            {value || '-'}
          </div>,
        ])}
      </section>

      {error &&
        (error.message?.includes('no such file') ? (
          <NonIdealState
            icon={<span className="bp3-icon custom-icon custom-icon-64">{IconSet.DB_ERROR}</span>}
            // className="height-auto"
            description={
              <p>
                This image could not be found.
                <br />
                Would you like to remove it from Allusion,
                <br />
                or merge with another entry?
              </p>
            }
            action={
              <ButtonGroup>
                <Button text="Remove" intent="danger" />
                <Button text="Merge" intent="warning" />
              </ButtonGroup>
            }
          />
        ) : (
          <Callout intent="warning" title="An error has occured">
            Error: {error.name} <br /> {error.message}
          </Callout>
        ))}
    </>
  );
});

export default ImageInfo;
