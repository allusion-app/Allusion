import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import { remote } from 'electron';
import fse from 'fs-extra';
import path from 'path';

import StoreContext from '../contexts/StoreContext';
import { Button } from '@blueprintjs/core';
import FileStore from '../stores/FileStore';

const chooseDirectory = async (fileStore: FileStore) => {
  const dirs = remote.dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections'],
  });

  if (!dirs) {
    return;
  }

  dirs.forEach(async (dir) => {
    // Check if directory
    // const stats = await fse.lstat(dirs[0]);
    const imgExtensions = ['gif', 'png', 'jpg', 'jpeg'];

    const filenames = await fse.readdir(dir);
    const imgFileNames = filenames.filter((f) =>
      imgExtensions.some((ext) =>
        f.toLowerCase()
          .endsWith(ext)),
    );

    imgFileNames.forEach(async (filename) => {
      const joinedPath = path.join(dir, filename);
      console.log(joinedPath);
      fileStore.addFile(joinedPath);
    });
  });
};

const ImportForm = () => {
  // Todo: Add Location entity to DB, so we can have user-picked directories as well
  // Todo: Also show sub-directories in tree

  const { fileStore } = useContext(StoreContext);

  const handleChooseDirectory = useCallback(
    () => chooseDirectory(fileStore),
    [],
  );

  return (
    <>
      <Button fill disabled icon="document-open">
        Import images
      </Button>

      <Button fill onClick={handleChooseDirectory} icon="folder-shared">
        Import single directory
      </Button>

      <Button fill disabled icon="folder-open">
        Import nested directories
      </Button>

      {/* Todo: Show progress bar here */}
    </>
  );
};

export default observer(ImportForm);
