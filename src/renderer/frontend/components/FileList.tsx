import Electron from 'electron';
import fse from 'fs-extra';
import { inject, observer } from 'mobx-react';
import React from 'react';
import RootStore from '../stores/RootStore';

export interface IFileListProps {
  rootStore?: RootStore;
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

    <button onClick={chooseDirectory}>
      Add images to your Visual Library
    </button>
  </div>
);

export default inject('rootStore')(observer(FileList));
