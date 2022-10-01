// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// All of the Node.js APIs are available in this process.

import { IS_DEV } from 'common/process';
import { promiseRetry } from 'common/timeout';
import { IS_PREVIEW_WINDOW, WINDOW_STORAGE_KEY } from 'common/window';
import { autorun, reaction, runInAction } from 'mobx';
import React from 'react';
import { createRoot } from 'react-dom/client';
import { RendererMessenger } from 'src/ipc/renderer';
import Backend from './backend/backend';
import App from './frontend/App';
import SplashScreen from './frontend/containers/SplashScreen';
import StoreProvider from './frontend/contexts/StoreContext';
import Overlay from './frontend/Overlay';
import PreviewApp from './frontend/Preview';
import { FILE_STORAGE_KEY } from './frontend/stores/FileStore';
import RootStore from './frontend/stores/RootStore';
import { PREFERENCES_STORAGE_KEY } from './frontend/stores/UiStore';
// Import the styles here to let Webpack know to include them
// in the HTML file
import './style.scss';

async function main(): Promise<void> {
  const container = document.getElementById('app');

  if (container === null) {
    throw new Error('Unable to create user interface.');
  }

  const root = createRoot(container);

  root.render(<SplashScreen />);

  // Initialize the backend for the App, that serves as an API to the front-end
  const backend = await Backend.init();
  console.log('Backend has been initialized!');

  const SPLASH_SCREEN_TIME = 1400;

  const [[rootStore, Component]] = await Promise.all([
    !IS_PREVIEW_WINDOW ? setupMainApp(backend) : setupPreviewApp(backend),
    new Promise((resolve) => setTimeout(resolve, SPLASH_SCREEN_TIME)),
  ]);

  autorun(() => {
    document.title = rootStore.getWindowTitle();
  });

  // Render our react components in the div with id 'app' in the html file
  // The Provider component provides the state management for the application
  root.render(
    <StoreProvider value={rootStore}>
      <Component />
      <Overlay />
    </StoreProvider>,
  );

  window.addEventListener('beforeunload', () => {
    // TODO: check whether this works okay with running in background process
    // And when force-closing the application. I think it might be keep running...
    // Update: yes, it keeps running when force-closing. Not sure how to fix. Don't think it can run as child-process
    rootStore.exifTool.close();
  });

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
}

async function setupMainApp(backend: Backend): Promise<[RootStore, () => JSX.Element]> {
  const [rootStore] = await Promise.all([RootStore.main(backend), backend.setupBackup()]);
  RendererMessenger.initialized();

  RendererMessenger.onClosedPreviewWindow(() => {
    rootStore.uiStore.closePreviewWindow();
  });

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

  // Debounced and automatic storing of preferences
  reaction(
    () => rootStore.fileStore.getPersistentPreferences(),
    (preferences) => {
      localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(preferences));
    },
    { delay: 200 },
  );

  reaction(
    () => rootStore.uiStore.getPersistentPreferences(),
    (preferences) => {
      localStorage.setItem(PREFERENCES_STORAGE_KEY, JSON.stringify(preferences));
    },
    { delay: 200 },
  );

  return [rootStore, App];
}

async function setupPreviewApp(backend: Backend): Promise<[RootStore, () => JSX.Element]> {
  const rootStore = await RootStore.preview(backend);
  rootStore.uiStore.enableSlideMode();
  RendererMessenger.initialized();

  RendererMessenger.onReceivePreviewFiles(
    async ({ ids, thumbnailDirectory, viewMethod, activeImgId }) => {
      rootStore.uiStore.setThumbnailDirectory(thumbnailDirectory);
      rootStore.uiStore.setMethod(viewMethod);
      rootStore.uiStore.enableSlideMode();

      runInAction(() => {
        rootStore.uiStore.isInspectorOpen = false;
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

      await rootStore.fileStore.updateFromBackend(files);
      rootStore.uiStore.setFirstItem((activeImgId && ids.indexOf(activeImgId)) || 0);
    },
  );

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
  return [rootStore, PreviewApp];
}

main()
  .then(() => console.info('Successfully initialized Allusion!'))
  .catch((err) => {
    console.error('Could not initialize Allusion!', err);
    window.alert('An error has occurred, check the console for more details');

    // In dev mode, the console is already automatically opened: only open in non-dev mode here
    if (!IS_DEV) {
      RendererMessenger.toggleDevTools();
    }
  });
