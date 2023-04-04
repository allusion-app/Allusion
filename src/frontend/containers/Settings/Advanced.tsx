import { getThumbnailPath, isDirEmpty } from 'common/fs';
import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useEffect, useState } from 'react';
import FileInput from 'src/frontend/components/FileInput';
import { RendererMessenger } from 'src/ipc/renderer';
import { Button, ButtonGroup, IconSet } from 'widgets';
import { useStore } from '../../contexts/StoreContext';
import { moveThumbnailDir } from '../../image/ThumbnailGeneration';
import { ClearDbButton } from '../ErrorBoundary';
import { Callout } from 'widgets/notifications';
import ExternalLink from 'src/frontend/components/ExternalLink';

export const Advanced = observer(() => {
  const { uiStore, fileStore } = useStore();
  const thumbnailDirectory = uiStore.thumbnailDirectory;

  const [defaultThumbnailDir, setDefaultThumbnailDir] = useState('');
  useEffect(() => {
    RendererMessenger.getDefaultThumbnailDirectory().then(setDefaultThumbnailDir);
  }, []);

  const changeThumbnailDirectory = async (newDir: string) => {
    const oldDir = thumbnailDirectory;

    // Move thumbnail files
    await moveThumbnailDir(oldDir, newDir);
    uiStore.setThumbnailDirectory(newDir);

    // Reset thumbnail paths for those that already have one
    runInAction(() => {
      for (const f of fileStore.fileList) {
        if (f.thumbnailPath && f.thumbnailPath !== f.absolutePath) {
          f.setThumbnailPath(getThumbnailPath(f.absolutePath, newDir));
        }
      }
    });
  };

  const browseThumbnailDirectory = async ([newDir]: [string, ...string[]]) => {
    if (!(await isDirEmpty(newDir))) {
      if (
        window.confirm(
          `The directory you picked is not empty. Allusion might delete any files inside of it. Do you still wish to pick this directory?\n\nYou picked: ${newDir}`,
        )
      ) {
        changeThumbnailDirectory(newDir);
      }
    } else {
      changeThumbnailDirectory(newDir);
    }
  };

  return (
    <>
      {/* Todo: Add support to toggle this */}
      {/* <Switch checked={true} onChange={() => alert('Not supported yet')} label="Generate thumbnails" /> */}
      <Callout icon={IconSet.INFO}>
        By default thumbnails are stored in the{' '}
        <ExternalLink url={defaultThumbnailDir}>temporary files directory</ExternalLink>.
      </Callout>
      <div className="filepicker">
        <FileInput
          className="btn-minimal filepicker-input"
          options={{
            properties: ['openDirectory'],
            defaultPath: thumbnailDirectory,
          }}
          onChange={browseThumbnailDirectory}
        >
          Change...
        </FileInput>
        <h3 className="filepicker-label">Thumbnail Directory</h3>
        <div className="filepicker-path">{thumbnailDirectory}</div>
      </div>

      <h3>Development</h3>
      <ButtonGroup>
        <ClearDbButton />
        <Button
          onClick={RendererMessenger.toggleDevTools}
          styling="outlined"
          icon={IconSet.CHROME_DEVTOOLS}
          text="Toggle DevTools"
        />
      </ButtonGroup>
    </>
  );
});
