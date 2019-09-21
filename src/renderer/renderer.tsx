// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';
import { ipcRenderer, remote } from 'electron';

import HTML5Backend from 'react-dnd-html5-backend';
import { DndProvider } from 'react-dnd';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import Backend from './backend/Backend';
import App from './frontend/App';
import StoreContext from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';
import PreviewApp from './frontend/Preview';
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
  })
  .catch((err) => console.log('Could not initialize backend!', err));

if (isPreviewWindow) {
  ipcRenderer.on('receivePreviewFiles', (event: any, fileIds: ID[]) => {
    rootStore.uiStore.view.setFirstItem(0);
    rootStore.fileStore.fetchFilesByIDs(fileIds);
  });

  // Close preview with space
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.code === 'Space' || e.code === 'Escape') {
      rootStore.uiStore.clearFileSelection();
      rootStore.fileStore.clearFileList();
      rootStore.uiStore.view.setMethodSlide();

      // remove focus from element so closing preview with spacebar does not trigger any ui elements
      if (document.activeElement && document.activeElement instanceof HTMLElement) {
        document.activeElement.blur();
      }

      window.close();
    }
  });

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
      const file = rootStore.fileStore.get(list[0]);
      if (file) {
        document.title = `${PREVIEW_WINDOW_BASENAME} - ${file.path}`;
      }
    }
  });
} else {
  ipcRenderer.on('closedPreviewWindow', () => {
    rootStore.uiStore.closePreviewWindow();
  });

  // Load persistent preferences
  rootStore.uiStore.recoverPersistentPreferences();

  // Before closing the main window, store preferences
  remote.getCurrentWindow().on('close', () => {
    rootStore.uiStore.storePersistentPreferences();
  });
}

// Render our react components in the div with id 'app' in the html file
// The Provider component provides the state management for the application
ReactDOM.render(
  <DndProvider backend={HTML5Backend}>
    <StoreContext.Provider value={rootStore}>
      {isPreviewWindow ? <PreviewApp /> : <App />}
    </StoreContext.Provider>
  </DndProvider>,
  document.getElementById('app'),
);
