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

ipcRenderer.on('importExternalImage', (e: IpcMessageEvent, item: IImportItem) => {
  console.log('Importing image...', item);
  rootStore.fileStore.addFile(item.filePath);
});
