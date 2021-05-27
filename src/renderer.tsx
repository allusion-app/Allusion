// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import React from 'react';
import ReactDOM from 'react-dom';

// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

import { RendererMessenger } from './Messaging';

import Backend from './backend/Backend';

import StoreProvider from './frontend/contexts/StoreContext';
import RootStore from './frontend/stores/RootStore';

import App from './frontend/App';
import PreviewApp from './frontend/Preview';
import { promiseRetry } from './frontend/utils';
import { Preferences } from './frontend/stores/Preferences';

export const NUM_LOGICAL_CORES = navigator.hardwareConcurrency;

(async function () {
  try {
    await main();
  } catch (error) {
    console.error('Initializing app failed.', error);
    // TODO: Render error message.
  }
})();

async function main() {
  // Initialize the backend for the App, that serves as an API to the front-end
  const backend = new Backend();
  const preferences = new Preferences();
  const rootStore = new RootStore(backend, preferences);

  const params = new URLSearchParams(window.location.search.slice(1));
  const isPreviewWindow = params.get('preview') === 'true';

  await backend.init(!isPreviewWindow);
  console.log('Backend has been initialized!');

  if (!isPreviewWindow) {
    // Load persistent preferences
    await preferences.load();
    render(<App />);
    await rootStore.initView();
    await rootStore.fetchFiles();
  } else {
    RendererMessenger.onReceivePreviewFiles(({ ids, thumbnailDirectory, activeImgId }) => {
      rootStore.uiStore.setFirstItem((activeImgId && ids.indexOf(activeImgId)) || 0);
      rootStore.uiStore.setThumbnailDirectory(thumbnailDirectory);
      rootStore.fileStore.fetchFilesByIDs(ids);
    });

    await rootStore.initView();
    render(<PreviewApp />);
  }

  window.addEventListener('beforeunload', () => {
    // TODO: check whether this works okay with running in background process
    // And when force-closing the application. I think it might be keep running...
    // Update: yes, it keeps running when force-closing. Not sure how to fix. Don't think it can run as child-process
    rootStore.exifTool.close();
  });

  // Render our react components in the div with id 'app' in the html file
  // The Provider component provides the state management for the application
  function render(rootElement: React.ReactElement) {
    RendererMessenger.initialized();
    ReactDOM.render(
      <StoreProvider value={rootStore}>{rootElement}</StoreProvider>,
      document.getElementById('app'),
    );
  }

  // -------------------------------------------
  // Messaging with the main process
  // -------------------------------------------

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
          const clientTag = tagStore.findByName(tagName);
          if (clientTag !== undefined) {
            return clientTag;
          } else {
            const newClientTag = await tagStore.create(tagName);
            return newClientTag;
          }
        }),
      );
      tags.forEach(clientFile.addTag);
    } else {
      throw new Error('Could not find image to set tags for ' + filePath);
    }
  }
}
