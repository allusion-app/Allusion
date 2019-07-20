// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, IpcMessageEvent } from 'electron';

import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContextProvider } from 'react-dnd';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import Backend from './backend/Backend';
import App from './frontend/App';
import StoreContext from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';
import { IImportItem } from '../main/clipServer';
import PreviewApp from './frontend/components/Preview';
import { ID } from './entities/ID';

export const PREVIEW_WINDOW_BASENAME = 'Allusion Quick View';

const params = new URLSearchParams(window.location.search.slice(1));
const isPreviewWindow = params.get('preview') === 'true';

// Initialize the backend for the App, that serves as an API to the front-end
const backend = new Backend();
const rootStore = new RootStore(backend);
backend
  .init()
  .then(async () => {
    console.log('Backend has been initialized!');
    await rootStore.init(!isPreviewWindow);
    ipcRenderer.send('initialized');
  })
  .catch((err) => console.log('Could not initialize backend!', err));

if (isPreviewWindow) {
  ipcRenderer.on('receivePreviewFiles', (event: any, fileIds: ID[]) => {
    rootStore.fileStore.fetchFilesByIDs(fileIds);
  });
  // Close preview with space
  window.addEventListener('keydown', (e) => (e.code === 'Space' || e.code === 'Escape') && window.close());
  // Change window title to filename on load
  rootStore.fileStore.fileList.observe(({ object: list }) => {
    if (list.length > 0) {
      const file = list[0];
      document.title = `${PREVIEW_WINDOW_BASENAME} - ${file.path}`;
    }
  });
  // Change window title to filename when changing the selected file
  rootStore.uiStore.fileSelection.observe(({ object: list }) => {
    if (list.length > 0) {
      const file = rootStore.fileStore.fileList.find((f) => f.id === list[0]);
      if (file) {
        document.title = `${PREVIEW_WINDOW_BASENAME} - ${file.path}`;
      }
    }
  });
} else {
  ipcRenderer.on('closedPreviewWindow', () => {
    rootStore.uiStore.isPreviewOpen = false;
  });
}

// Render our react components in the div with id 'app' in the html file
// The Provider component provides the state management for the application
ReactDOM.render(
  <DragDropContextProvider backend={HTML5Backend}>
    <StoreContext.Provider value={rootStore}>
      {isPreviewWindow ? <PreviewApp /> : <App />}
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
