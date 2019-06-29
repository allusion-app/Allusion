// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';

import HTML5Backend from 'react-dnd-html5-backend';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import Backend from './backend/Backend';
import App from './frontend/App';
import StoreContext from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';
import { DragDropContextProvider } from 'react-dnd';
import { ipcRenderer, IpcMessageEvent } from 'electron';
import { IImportItem } from '../main/clipServer';

// Initialize the backend for the App, that serves as an API to the front-end
const backend = new Backend();
const rootStore = new RootStore(backend);
backend
  .init()
  .then(async () => {
    console.log('Backend has been initialized!');
    await rootStore.init();
    ipcRenderer.send('initialized');
  })
  .catch((err) => console.log('Could not initialize backend!', err));

// Render our react components in the div with id 'app' in the html file
// The Provider component provides the state management for the application
ReactDOM.render(
  <DragDropContextProvider backend={HTML5Backend}>
    <StoreContext.Provider value={rootStore}>
      <App />
    </StoreContext.Provider>
  </DragDropContextProvider>,
  document.getElementById('app'),
);

/**
 * Adds tags to a file, given its name and the names of the tags
 * @param filePath The path of the file
 * @param tagNames The names of the tags
 */
async function addTagsToFile(filePath: string, tagNames: string[]) {
  const clientFile = rootStore.fileStore.fileList.find((file) => file.path === filePath);
  if (clientFile) {
    const tagIds = await Promise.all(tagNames.map(async (tagName) => {
      const clientTag = rootStore.tagStore.tagList.find((tag) => tag.name === tagName);
      console.log(clientTag);
      if (clientTag) {
        return clientTag.id;
      } else {
        const newClientTag = await rootStore.tagStore.addTag(tagName);
        rootStore.tagCollectionStore.getRootCollection().addTag(newClientTag);
        return newClientTag.id;
      }
    }));
    clientFile.tags.push(...tagIds);
  } else {
    console.error('Could not find image to set tags for', filePath);
  }
}

ipcRenderer.on('importExternalImage', async (e: IpcMessageEvent, item: IImportItem) => {
  console.log('Importing image...', item);
  await rootStore.fileStore.addFile(item.filePath, item.dateAdded);
  await addTagsToFile(item.filePath, item.tagNames);
});

ipcRenderer.on('addTagsToFile', async (e: IpcMessageEvent, item: IImportItem) => {
  console.log('Adding tags to file...', item);
  await addTagsToFile(item.filePath, item.tagNames);
});

ipcRenderer.on('getTags', async (e: IpcMessageEvent) => {
  e.returnValue = await backend.fetchTags();
});
