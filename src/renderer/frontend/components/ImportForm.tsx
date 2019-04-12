import React, { useCallback } from 'react';
import { observer } from 'mobx-react-lite';
import { useContext } from 'react';
import { remote } from 'electron';
import fse from 'fs-extra';
import path from 'path';

import StoreContext from '../contexts/StoreContext';
import { Button } from '@blueprintjs/core';
import FileStore from '../stores/FileStore';
import { ClientTagCollection } from '../../entities/TagCollection';
import TagStore from '../stores/TagStore';

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

/** Opens a folder picker and adds all files and sub-directories to the library */
const chooseFolderStructure = async (fileStore: FileStore) => {
  const dirs = remote.dialog.showOpenDialog({
    properties: ['openDirectory'],
  });
  if (!dirs || dirs.length !== 1) {
    return;
  }
  // Add new collections to the root collection
  const root = fileStore.rootStore.tagCollectionStore.getRootCollection();
  // Initiate recursive call
  await importDirRecursive(fileStore, fileStore.rootStore.tagStore, dirs[0], root);
};

/** Recursively adds a directory and its files to the library */
const importDirRecursive = async (
  fileStore: FileStore,
  tagStore: TagStore,
  dir: string,
  parent: ClientTagCollection,
) => {
  // Import files of this dir
  await importDir(fileStore, dir, tagStore, parent, true);

  const filenames = await fse.readdir(dir);
  const filenamesStats = await Promise.all(filenames.map((f) => fse.lstat(path.join(dir, f))));
  const subDirs = filenames.filter((_, i) => filenamesStats[i].isDirectory());

  // If there are any subdirectories, import those as well
  subDirs.forEach(async (folderName) => {
    const tagCollectionStore = tagStore.rootStore.tagCollectionStore;
    const newCol = tagCollectionStore.addTagCollection(folderName, parent);
    importDirRecursive(fileStore, tagStore, path.join(dir, folderName), newCol);
  });
};

const importDir = async (
  fileStore: FileStore,
  dir: string,
  tagStore: TagStore,
  parent?: ClientTagCollection,
  addFolderTag = false,
) => {
  // Todo: Also skip hidden directories?
  // Todo: Put a limit on the amount of recursive levels in case someone adds their entire disk?
  // Skip 'dot' directories ('.ssh' etc.)
  if (path.basename(dir).startsWith('.')) {
    return;
  }

  const imgExtensions = ['gif', 'png', 'jpg', 'jpeg'];

  const filenames = await fse.readdir(dir);
  const imgFileNames = filenames.filter((f) =>
    // No 'dot' files (e.g. ".image.jpg" (looking at you, MAC))
    !f.startsWith('.')
    // Only add image files
    && imgExtensions.some((ext) => f.toLowerCase().endsWith(ext)),
  );

  const addedFiles = await Promise.all(
    imgFileNames.map((filename) => {
      const joinedPath = path.join(dir, filename);
      return fileStore.addFile(joinedPath);
    }),
  );

  // Automatically add files in this folder to a tag with the name of the folder
  if (addFolderTag && parent && addedFiles.length > 0) {
    const folderName = path.basename(dir);
    // Create tag for this directory
    const tag = await tagStore.addTag(folderName);
    // Add tag to collection
    parent.tags.push(tag.id);
    // Add tag to files
    addedFiles.forEach((f) => f.tags.push(tag.id));
  }
};

const ImportForm = () => {
  // Todo: Add Location entity to DB, so we can have user-picked directories as well
  // Todo: Also show sub-directories in tree

  const { fileStore } = useContext(StoreContext);

  const handleChooseDirectory = useCallback(
    () => chooseDirectory(fileStore),
    [],
  );

  const handleChooseFolderStructure = useCallback(
    () => chooseFolderStructure(fileStore),
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

      <Button fill onClick={handleChooseFolderStructure} icon="folder-open">
        Import nested directories
      </Button>

      {/* Todo: Show progress bar here */}
    </>
  );
};

export default observer(ImportForm);
