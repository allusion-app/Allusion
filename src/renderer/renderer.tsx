// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import 'mobx-react-lite/batchingForReactDom';
import React from 'react';
import ReactDOM from 'react-dom';
import { remote } from 'electron';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

// Custom Blueprint functionality overrides
import './frontend/BpOverride';

import Backend from './backend/Backend';
import App from './frontend/App';
import StoreContext from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';
import PreviewApp from './frontend/Preview';
import { RendererMessenger } from '../Messaging';
import { DEFAULT_LOCATION_ID } from './entities/Location';

export const PREVIEW_WINDOW_BASENAME = 'Allusion Quick View';

const params = new URLSearchParams(window.location.search.slice(1));
export const IS_PREVIEW_WINDOW = params.get('preview') === 'true';

// Initialize the backend for the App, that serves as an API to the front-end
const backend = new Backend();
const rootStore = new RootStore(backend);
backend
  .init()
  .then(async () => {
    console.log('Backend has been initialized!');
    await rootStore.init(!IS_PREVIEW_WINDOW);
    RendererMessenger.initialized();
  })
  .catch((err) => console.log('Could not initialize backend!', err));

if (IS_PREVIEW_WINDOW) {
  RendererMessenger.onReceivePreviewFiles(({ ids, thumbnailDirectory }) => {
    rootStore.uiStore.setFirstItem(0);
    rootStore.uiStore.setThumbnailDirectory(thumbnailDirectory);
    rootStore.uiStore.enableSlideMode();
    rootStore.fileStore.fetchFilesByIDs(ids);
  });

  // Close preview with space
  window.addEventListener('keydown', (e: KeyboardEvent) => {
    if (e.key === ' ' || e.key === 'Escape') {
      rootStore.uiStore.clearFileSelection();
      rootStore.fileStore.clearFileList();
      rootStore.uiStore.enableSlideMode();

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
      document.title = `${PREVIEW_WINDOW_BASENAME} - ${file.absolutePath}`;
    }
  });

  // Change window title to filename when changing the selected file
  rootStore.uiStore.fileSelection.observe(({ object: list }) => {
    if (list.size > 0) {
      const file = rootStore.fileStore.get(rootStore.uiStore.getFirstSelectedFileId());
      if (file) {
        document.title = `${PREVIEW_WINDOW_BASENAME} - ${file.absolutePath}`;
      }
    }
  });
} else {
  RendererMessenger.onClosedPreviewWindow(() => {
    rootStore.uiStore.closePreviewWindow();
  });

  // Load persistent preferences
  rootStore.uiStore.recoverPersistentPreferences();
  rootStore.fileStore.recoverPersistentPreferences();

  // Before closing the main window, store preferences
  remote.getCurrentWindow().on('close', () => {
    rootStore.uiStore.storePersistentPreferences();
  });
}

// Render our react components in the div with id 'app' in the html file
// The Provider component provides the state management for the application
ReactDOM.render(
  <StoreContext.Provider value={rootStore}>
    {IS_PREVIEW_WINDOW ? <PreviewApp /> : <App />}
  </StoreContext.Provider>,
  document.getElementById('app'),
);

/**
 * Adds tags to a file, given its name and the names of the tags
 * @param filePath The path of the file
 * @param tagNames The names of the tags
 */
async function addTagsToFile(filePath: string, tagNames: string[]) {
  const clientFile = rootStore.fileStore.fileList.find((file) => file.absolutePath === filePath);
  if (clientFile) {
    const tagIds = await Promise.all(
      tagNames.map(async (tagName) => {
        const clientTag = rootStore.tagStore.tagList.find((tag) => tag.name === tagName);
        console.log(clientTag);
        if (clientTag) {
          return clientTag.id;
        } else {
          const newClientTag = await rootStore.tagStore.addTag(tagName);
          rootStore.tagCollectionStore.getRootCollection().addTag(newClientTag);
          return newClientTag.id;
        }
      }),
    );
    tagIds.forEach((t) => clientFile.addTag(t));
  } else {
    console.error('Could not find image to set tags for', filePath);
  }
}

RendererMessenger.onImportExternalImage(async ({ item }) => {
  console.log('Importing image...', item);
  await rootStore.fileStore.addFile(item.filePath, DEFAULT_LOCATION_ID, item.dateAdded);
  await addTagsToFile(item.filePath, item.tagNames);
});

RendererMessenger.onAddTagsToFile(async ({ item }) => {
  console.log('Adding tags to file...', item);
  await addTagsToFile(item.filePath, item.tagNames);
});

RendererMessenger.onGetTags(async () => ({ tags: await backend.fetchTags() }));

RendererMessenger.onGetDownloadPath(() => rootStore.locationStore.importDirectory);
