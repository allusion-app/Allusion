import { remote } from 'electron';
import fse from 'fs-extra';
import path from 'path';
import React from 'react';

import { observer } from 'mobx-react-lite';

import { Button } from '@blueprintjs/core';

import { withRootstore } from '../contexts/StoreContext';
import FileStore from '../stores/FileStore';
import RootStore from '../stores/RootStore';

import Gallery from './Gallery';

export interface IFileListProps {
  rootStore: RootStore;
}

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
      imgExtensions.some((ext) => f.toLowerCase().endsWith(ext)),
    );

    imgFileNames.forEach(async (filename) => {
      const joinedPath = path.join(dir, filename);
      console.log(joinedPath);
      fileStore.addFile(joinedPath);
    });
  });
};

const FileList = ({ rootStore: { fileStore } }: IFileListProps) => {
  return (
    <div>
      <Button onClick={() => chooseDirectory(fileStore)} icon="folder-open">
        Add images to your Visual Library
      </Button>

      <br />
      <br />

      <Gallery />
    </div>
  );
};

export default withRootstore(observer(FileList));
