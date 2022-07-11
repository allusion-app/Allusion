// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';
import { action, reaction, runInAction } from 'mobx';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import { RendererMessenger } from './Messaging';

import Backend from './backend/Backend';

import StoreProvider from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';

import App from './frontend/App';
import PreviewApp from './frontend/Preview';
import Overlay from './frontend/Overlay';
import { IS_PREVIEW_WINDOW } from 'common/window';
import { promiseRetry } from '../common/timeout';
import { loadUserPreferences, storeUserPreferences } from './frontend/data/UserPreferences';

if (!IS_PREVIEW_WINDOW) {
  await launchMainApp();
} else {
  await launchPreviewApp();
}

async function launchMainApp() {
  const preferences = await loadUserPreferences();
  // Restore window preferences
  RendererMessenger.setTheme({ theme: preferences.theme === 'dark' ? 'dark' : 'light' });
  RendererMessenger.setFullScreen(preferences.isFullScreen);

  // Initialize the backend for the App, that serves as an API to the front-end
  const backend = await Backend.connect();
  console.log('Backend has been initialized!');

  const rootStore = new RootStore(backend, preferences);
  await rootStore.init(false);
  RendererMessenger.initialized();

  const { fileStore, exifTool, uiStore } = rootStore;

  RendererMessenger.onClosedPreviewWindow(() => {
    uiStore.closePreviewWindow();
  });

  reaction(
    () => ({
      theme: uiStore.theme,
      isOutlinerOpen: uiStore.isOutlinerOpen,
      isInspectorOpen: uiStore.isInspectorOpen,
      thumbnailDirectory: uiStore.thumbnailDirectory,
      importDirectory: uiStore.importDirectory,
      method: uiStore.method,
      thumbnailSize: uiStore.thumbnailSize,
      thumbnailShape: uiStore.thumbnailShape,
      hotkeyMap: { ...uiStore.hotkeyMap },
      isThumbnailTagOverlayEnabled: uiStore.isThumbnailTagOverlayEnabled,
      isThumbnailFilenameOverlayEnabled: uiStore.isThumbnailFilenameOverlayEnabled,
      outlinerWidth: uiStore.outlinerWidth,
      inspectorWidth: uiStore.inspectorWidth,
      isFullScreen: uiStore.isFullScreen,
      isSlideMode: uiStore.isSlideMode,
      firstItem: uiStore.firstItem,
      searchMatchAny: uiStore.searchMatchAny,
      searchCriteriaList: uiStore.isRememberSearchEnabled
        ? uiStore.searchCriteriaList.map((criteria) => ({ ...criteria }))
        : undefined,
      orderDirection: fileStore.orderDirection,
      orderBy: fileStore.orderBy,
      hierarchicalSeparator: exifTool.hierarchicalSeparator,
    }),
    storeUserPreferences,
    { delay: 500, fireImmediately: true },
  );

  window.addEventListener('beforeunload', () => {
    // TODO: check whether this works okay with running in background process
    // And when force-closing the application. I think it might be keep running...
    // Update: yes, it keeps running when force-closing. Not sure how to fix. Don't think it can run as child-process
    rootStore.exifTool.close();
  });

  // Render our react components in the div with id 'app' in the html file
  // The Provider component provides the state management for the application
  ReactDOM.render(
    <StoreProvider value={rootStore}>
      <App />
      <Overlay />
    </StoreProvider>,
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
    const clientFile = runInAction(() =>
      fileStore.fileList.find((file) => file.absolutePath === filePath),
    );
    if (clientFile) {
      const tags = await Promise.all(
        tagNames.map(async (tagName) => {
          const clientTag = tagStore.findByName(tagName);
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

  RendererMessenger.onFullScreenChanged(
    action((isFullScreen) => {
      if (rootStore.uiStore.isFullScreen !== isFullScreen) {
        rootStore.uiStore.toggleFullScreen();
      }
    }),
  );
}

async function launchPreviewApp() {
  const preferences = await loadUserPreferences();
  // Restore window preferences
  RendererMessenger.setTheme({ theme: preferences.theme === 'dark' ? 'dark' : 'light' });

  const backend = new Backend();

  const rootStore = new RootStore(backend, preferences);
  await rootStore.init(true);

  RendererMessenger.initialized();

  RendererMessenger.onReceivePreviewFiles(
    async ({ ids, thumbnailDirectory, viewMethod, activeImgId }) => {
      rootStore.uiStore.setThumbnailDirectory(thumbnailDirectory);
      rootStore.uiStore.setMethod(viewMethod);
      rootStore.uiStore.enableSlideMode();

      runInAction(() => {
        if (rootStore.uiStore.isInspectorOpen) {
          rootStore.uiStore.toggleInspector();
        }
      });

      const files = await backend.fetchFilesByID(ids);

      // If a file has a location we don't know about (e.g. when a new location was added to the main window),
      // re-fetch the locations in the preview window
      const hasNewLocation = runInAction(() =>
        files.some((f) => !rootStore.locationStore.locationList.find((l) => l.id === f.id)),
      );
      if (hasNewLocation) {
        await rootStore.locationStore.init();
      }

      rootStore.fileStore.updateFromBackend(files);
      rootStore.uiStore.setFirstItem((activeImgId && ids.indexOf(activeImgId)) || 0);
    },
  );

  // Close preview with space
  window.addEventListener(
    'keydown',
    action((e: KeyboardEvent) => {
      if (e.key === ' ' || e.key === 'Escape') {
        rootStore.uiStore.fileSelection.clear();
        rootStore.fileStore.fileIndex.clear();
        rootStore.uiStore.enableSlideMode();

        // remove focus from element so closing preview with spacebar does not trigger any ui elements
        if (document.activeElement && document.activeElement instanceof HTMLElement) {
          document.activeElement.blur();
        }

        window.close();
      }
    }),
  );

  // Render our react components in the div with id 'app' in the html file
  // The Provider component provides the state management for the application
  ReactDOM.render(
    <StoreProvider value={rootStore}>
      <PreviewApp />
      <Overlay />
    </StoreProvider>,
    document.getElementById('app'),
  );
}
