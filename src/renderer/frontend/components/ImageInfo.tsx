import React, { useEffect, useState, useMemo, useContext } from 'react';
import fse from 'fs-extra';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../entities/File';
import { formatDateTime } from '../utils';
import { Callout, ButtonGroup, Button, Card } from '@blueprintjs/core';
import StoreContext from '../contexts/StoreContext';

const ImageInfo = observer(({ file }: { file: ClientFile }) => {
  const { uiStore } = useContext(StoreContext);
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
          <Card style={{ margin: '8px', width: 'calc(100% - 16px)' }}>
            <p>
              This image could not be found.
              <br />
              Would you like to remove it from your library?
            </p>
            <ButtonGroup>
              <Button
                text="Remove"
                intent="danger"
                onClick={() => {
                  uiStore.selectFile(file, true);
                  uiStore.toggleToolbarFileRemover();
                }}
              />
            </ButtonGroup>
          </Card>
        ) : (
          <Callout intent="warning" title="An error has occured">
            Error: {error.name} <br /> {error.message}
          </Callout>
        ))}
    </>
  );
});

export default ImageInfo;
