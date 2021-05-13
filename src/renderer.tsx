// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';
import { observe, runInAction } from 'mobx';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import { RendererMessenger } from './Messaging';

import Backend from './backend/Backend';

import StoreContext from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';

import App from './frontend/App';
import PreviewApp from './frontend/Preview';
import { promiseRetry } from './frontend/utils';

// Window State
export const WINDOW_STORAGE_KEY = 'Allusion_Window';

export const PREVIEW_WINDOW_BASENAME = 'Allusion Quick View';

const params = new URLSearchParams(window.location.search.slice(1));
export const IS_PREVIEW_WINDOW = params.get('preview') === 'true';

// Initialize the backend for the App, that serves as an API to the front-end
const backend = new Backend();
const rootStore = new RootStore(backend);
backend
  .init(!IS_PREVIEW_WINDOW)
  .then(async () => {
    console.log('Backend has been initialized!');
    await rootStore.init(IS_PREVIEW_WINDOW);
    RendererMessenger.initialized();
  })
  .catch((err) => console.error('Could not initialize backend!', err));

if (IS_PREVIEW_WINDOW) {
  RendererMessenger.onReceivePreviewFiles(({ ids, thumbnailDirectory, activeImgId }) => {
    rootStore.uiStore.setFirstItem((activeImgId && ids.indexOf(activeImgId)) || 0);
    rootStore.uiStore.setThumbnailDirectory(thumbnailDirectory);
    rootStore.uiStore.enableSlideMode();
    rootStore.uiStore.isInspectorOpen && rootStore.uiStore.toggleInspector();
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
  observe(rootStore.fileStore.fileList, ({ object: list }) => {
    if (list.length > 0) {
      const file = list[0];
      document.title = `${file.absolutePath} • ${PREVIEW_WINDOW_BASENAME}`;
    }
  });

  // Change window title to filename when changing the selected file
  observe(rootStore.uiStore, 'firstItem', ({ object }) => {
    const index = object.get();
    if (!isNaN(index) && index >= 0 && index < rootStore.fileStore.fileList.length) {
      const file = rootStore.fileStore.fileList[index];
      document.title = `${file?.absolutePath || '?'} • ${PREVIEW_WINDOW_BASENAME}`;
    }
  });
} else {
  RendererMessenger.onClosedPreviewWindow(() => {
    rootStore.uiStore.closePreviewWindow();
  });

  // Load persistent preferences
  rootStore.uiStore.recoverPersistentPreferences();
  rootStore.fileStore.recoverPersistentPreferences();

  // Recover global preferences
  try {
    const window_preferences = localStorage.getItem(WINDOW_STORAGE_KEY);
    if (window_preferences === null) {
      localStorage.setItem(WINDOW_STORAGE_KEY, JSON.stringify({ isFullScreen: false }));
    } else {
      const prefs = JSON.parse(window_preferences);
      if (prefs.isFullScreen === true) {
        RendererMessenger.setFullScreen(true);
        rootStore.uiStore.setFullScreen(true);
      }
    }
  } catch (e) {
    console.error('Cannot load window preferences', e);
  }
}

window.addEventListener('beforeunload', () => {
  // TODO: check whether this works okay with running in background process
  // And when force-closing the application. I think it might be keep running...
  // Update: yes, it keeps running when force-closing. Not sure how to fix. Don't think it can run as child-process
  rootStore.fileStore.exifTool.close();
});

// Render our react components in the div with id 'app' in the html file
// The Provider component provides the state management for the application
ReactDOM.render(
  <StoreContext.Provider value={rootStore}>
    {IS_PREVIEW_WINDOW ? <PreviewApp /> : <App />}
  </StoreContext.Provider>,
  document.getElementById('app'),
);

// -------------------------------------------
// Messaging with the main process
// -------------------------------------------

/**
 * Adds tags to a file, given its name and the names of the tags
 * @param filePath The path of the file
 * @param tagNames The names of the tags
 */
async function addTagsToFile(filePath: string, tagNames: string[]) {
  const { fileStore, tagStore } = rootStore;
  const clientFile = fileStore.fileList.find((file) => file.absolutePath === filePath);
  if (clientFile) {
    const tags = await Promise.all(
      tagNames.map(async (tagName) => {
        const clientTag = runInAction(() =>
          tagStore.tagListWithoutRoot.find((tag) => tag.name === tagName),
        );
        if (clientTag !== undefined) {
          return clientTag;
        } else {
          const newClientTag = await tagStore.create(tagStore.root, tagName);
          return newClientTag;
        }
      }),
    );
    tags.forEach(clientFile.addTag);
  } else {
    throw new Error('Could not find image to set tags for ' + filePath);
  }
}

RendererMessenger.onImportExternalImage(async ({ item }) => {
  console.log('Importing image...', item);
  // Might take a while for the file watcher to detect the image - otherwise the image is not in the DB and cannot be tagged
  promiseRetry(() => addTagsToFile(item.filePath, item.tagNames));
});

RendererMessenger.onAddTagsToFile(async ({ item }) => {
  console.log('Adding tags to file...', item);
  await addTagsToFile(item.filePath, item.tagNames);
});

RendererMessenger.onGetTags(async () => ({ tags: await backend.fetchTags() }));

RendererMessenger.onFullScreenChanged((val) => rootStore.uiStore.setFullScreen(val));
