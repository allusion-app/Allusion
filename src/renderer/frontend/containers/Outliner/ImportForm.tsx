import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import { remote } from 'electron';
import fse from 'fs-extra';
import path from 'path';

import StoreContext from '../../contexts/StoreContext';
import { Button, H2, H4 } from '@blueprintjs/core';
import FileStore from '../../stores/FileStore';
import { ClientTagCollection } from '../../../entities/TagCollection';
import TagStore from '../../stores/TagStore';
import IconSet from '../../components/Icons';
import RootStore from '../../stores/RootStore';
import { IMG_EXTENSIONS } from '../../../entities/File';

export const imgExtensions = ['gif', 'png', 'jpg', 'jpeg'];

const chooseFiles = async (fileStore: FileStore) => {
  const files = remote.dialog.showOpenDialog({
    filters: [{ name: 'Images', extensions: imgExtensions }],
    properties: ['openFile', 'multiSelections'],
  });

  if (!files) {
    return;
  }

  files.forEach(async (filename) => {
    if (!filename.startsWith('.')) {
      fileStore.addFile(filename);
    }
  });
};

const chooseDirectories = async (fileStore: FileStore) => {
  const dirs = remote.dialog.showOpenDialog({
    properties: ['openDirectory', 'multiSelections'],
  });

  if (!dirs) {
    return;
  }

  dirs.forEach(async (dir) => {
    const imgFileNames = await findFiles(dir);

    imgFileNames.forEach(async (filename) => {
      const joinedPath = path.join(dir, filename);
      fileStore.addFile(joinedPath);
    });
  });
};

/** Opens a folder picker and adds all files and sub-directories to the library */
const chooseFolderStructure = async (rootStore: RootStore) => {
  const dirs = remote.dialog.showOpenDialog({
    properties: ['openDirectory'],
  });

  // multi-selection is disabled which means there can be at most 1 folder
  if (!dirs || dirs.length === 0) {
    return;
  }
  // Add new collections to the root collection
  const root = rootStore.tagCollectionStore.getRootCollection();
  // Initiate recursive call
  await importDirRecursive(rootStore, dirs[0], root);
};

/** Recursively adds a directory and its files to the library */
const importDirRecursive = async (
  rootStore: RootStore,
  dir: string,
  parent: ClientTagCollection,
) => {
  const filenames = await fse.readdir(dir);
  const filenamesStats = await Promise.all(filenames.map((f) => fse.lstat(path.join(dir, f))));
  const subDirs = filenames.filter((_, i) => filenamesStats[i].isDirectory());

  const { fileStore, tagStore, tagCollectionStore } = rootStore;
  if (subDirs.length === 0) {
    // If a dir contains no subdirs, but does contain files, only create a Tag, not a Collection
    await importAndTagDir(fileStore, dir, tagStore, parent);
  } else {
    // Else, create a collection
    const dirName = path.basename(dir);
    const dirCol = await tagCollectionStore.addTagCollection(dirName, parent);

    // Import the files in the folder
    await importAndTagDir(fileStore, dir, tagStore, dirCol);

    // Import all subdirs
    subDirs.forEach(async (folderName) => {
      importDirRecursive(rootStore, path.join(dir, folderName), dirCol);
    });
  }
};

const importAndTagDir = async (
  fileStore: FileStore,
  dir: string,
  tagStore: TagStore,
  parent: ClientTagCollection,
) => {
  const addedFiles = await importDir(fileStore, dir);

  // Automatically add files in this folder to a tag with the name of the folder
  if (addedFiles.length > 0) {
    const folderName = path.basename(dir);
    // Create tag for this directory
    const tag = await tagStore.addTag(folderName);
    // Add tag to collection
    parent.addTag(tag.id);
    // Add tag to files
    addedFiles.forEach((f) => f.addTag(tag.id));
  }
};

const importDir = async (fileStore: FileStore, dir: string) => {
  // Todo: Also skip hidden directories?
  // Todo: Put a limit on the amount of recursive levels in case someone adds their entire disk?
  const imgFileNames = await findFiles(dir);

  return await Promise.all(
    imgFileNames.map((filename) => {
      const joinedPath = path.join(dir, filename);
      return fileStore.addFile(joinedPath);
    }),
  );
};

const findFiles = async (dir: string) => {
  // ignore 'dot' directories
  if (path.basename(dir).startsWith('.')) {
    return [];
  }

  const filenames = await fse.readdir(dir);
  return filenames.filter((f) => {
    // No 'dot' files (e.g. ".image.jpg" (looking at you, MAC))
    const file = f.toLowerCase();
    if (file.startsWith('.')) {
      return false;
    }
    // Only add image files
    return IMG_EXTENSIONS.some((ext) => file.endsWith(ext));
  });
};

// Tooltip info for imports
const enum Tooltip {
  ImportImage = 'Imports a single image or a selection of images, no tags are added',
  ImportFolder = 'Imports the images from a single folder without automatically tagging them',
  ImportFolderStructure = 'Imports an existing folder structure which generates tags and collections \
based on the names of the folders',
}

const ImportForm = observer(() => {
  // Todo: Add Location entity to DB, so we can have user-picked directories as well
  // Todo: Also show sub-directories in tree

  const rootStore = useContext(StoreContext);

  const handleChooseFiles = useCallback(() => chooseFiles(rootStore.fileStore), []);
  const handleChooseDirectory = useCallback(() => chooseDirectories(rootStore.fileStore), []);
  const handleChooseFolderStructure = useCallback(() => chooseFolderStructure(rootStore), []);

  const handleChooseWatchedDir = useCallback(async () => {
    const dirs = remote.dialog.showOpenDialog({
      properties: ['openDirectory'],
    });

    // multi-selection is disabled which means there can be at most 1 folder
    if (!dirs || dirs.length === 0) {
      return;
    }
    rootStore.watchedDirectoryStore.addDirectory({ path: dirs[0], recursive: true });
  }, []);

  return (
    <div id="import">
      <Button
        fill
        onClick={handleChooseFiles}
        icon={IconSet.MEDIA}
        className={'tooltip'}
        data-right={Tooltip.ImportImage}
      >
        Add Images
      </Button>

      <Button
        fill
        onClick={handleChooseDirectory}
        icon={IconSet.FOLDER_OPEN}
        className={'tooltip'}
        data-right={Tooltip.ImportFolder}
      >
        Add Single Directory
      </Button>

      <Button
        fill
        onClick={handleChooseFolderStructure}
        icon={IconSet.FOLDER_STRUCTURE}
        className={'tooltip'}
        data-right={Tooltip.ImportFolderStructure}
      >
        Add Nested Directories
      </Button>

      <br />

      <H4>Watched folders</H4>
      <ul id="watched-folders">
      {
        rootStore.watchedDirectoryStore.directoryList.map((dir) => (
          <li key={dir.path}>
            <span className="ellipsis-left" title={dir.path}>{dir.path}</span>
            <Button icon="trash" />
          </li>
        ))
      }
      </ul>
      <Button onClick={handleChooseWatchedDir}>Add</Button>

      {/* Todo: Show progress bar here */}
    </div>
  );
});

export default ImportForm;
