// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer } from 'electron';

import HTML5Backend from 'react-dnd-html5-backend';
import { DragDropContextProvider } from 'react-dnd';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import Backend from './backend/Backend';
import App from './frontend/App';
import StoreContext from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';
import PreviewApp from './frontend/components/Preview';
import { ID } from './entities/ID';

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
  })
  .catch((err) => console.log('Could not initialize backend!', err));

if (isPreviewWindow) {
  ipcRenderer.on('receivePreviewFiles', (event: any, fileIds: ID[]) => {
    rootStore.fileStore.fetchFilesByIDs(fileIds);
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
