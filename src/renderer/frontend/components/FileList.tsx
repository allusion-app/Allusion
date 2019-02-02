import { Button } from '@blueprintjs/core';
import Electron from 'electron';
import fse from 'fs-extra';
import React from 'react';
import { withRootstore } from '../contexts/StoreContext';
import RootStore from '../stores/RootStore';
import Gallery from './Gallery';

export interface IFileListProps {
  rootStore: RootStore;
}

const chooseDirectory = async () => {
  const dirs = Electron.remote.dialog.showOpenDialog({
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
    const imgFileNames = filenames.filter((f) => imgExtensions.some((ext) => f.toLowerCase().endsWith(ext)));

    console.log(imgFileNames);
    // Todo: Update FileStore
  });
};

const FileList = ({ rootStore: { fileStore } }: IFileListProps) => (
  <div>
    {
      fileStore.fileList.map((file, fileIndex) => (
        <div key={`file-${fileIndex}`}>
          <img src={file.path} />
        </div>
      ))
    }

    <Button onClick={chooseDirectory} icon="folder-open">
      Add images to your Visual Library
    </Button>

    <Gallery
      files={fileStore.fileList}
    />
  </div>
);

export default withRootstore(FileList);
