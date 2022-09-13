import fse from 'fs-extra';
import { action, makeObservable, observable, runInAction } from 'mobx';
import { IDataStorage } from 'src/api/data-storage';
import { ConditionDTO, OrderBy, OrderDirection } from 'src/api/data-storage-search';
import { ClientFile, mergeMovedFile } from 'src/entities/File';
import { FileDTO, IMG_EXTENSIONS_TYPE } from 'src/api/file';
import { ID } from 'src/api/id';
import { ClientLocation } from 'src/entities/Location';
import { ClientStringSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';
import { AppToaster } from '../components/Toaster';
import { debounce } from 'common/timeout';
import { getThumbnailPath } from 'common/fs';
import { chunks, clamp, map, retainArray } from 'common/core';
import RootStore from './RootStore';
import { IndexMap } from './index-map';

export const FILE_STORAGE_KEY = 'Allusion_File';

/** These fields are stored and recovered when the application opens up */
type PersistentPreferenceFields = 'orderDirection' | 'orderBy';

class FileStore {
  private readonly backend: IDataStorage;
  private readonly rootStore: RootStore;

  readonly index = new IndexMap<ID, ClientFile>();
  private readonly filesToSave = new Map<ID, FileDTO>();
  readonly #missingFiles = observable.set<ID>(new Set());

  @observable orderDirection = OrderDirection.Desc;
  @observable orderBy: OrderBy<FileDTO> = 'dateAdded';
  @observable numTotalFiles = 0;
  @observable numUntaggedFiles = 0;

  debouncedSaveFilesToSave: () => Promise<void>;

  constructor(backend: IDataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
    makeObservable(this);

    // Defer updating files to avoid multiple small writes to the database.
    this.debouncedSaveFilesToSave = debounce(this.saveFilesToSave, 100).bind(this);
  }

  get fileList(): readonly ClientFile[] {
    return this.index.values();
  }

  get numMissingFiles(): number {
    return this.#missingFiles.size;
  }

  @action.bound async readTagsFromFiles() {
    const toastKey = 'read-tags-from-file';
    try {
      const numFiles = this.fileList.length;
      for (let i = 0; i < numFiles; i++) {
        AppToaster.show(
          {
            message: `Reading tags from files ${((100 * i) / numFiles).toFixed(0)}%...`,
            timeout: 0,
          },
          toastKey,
        );
        const file = runInAction(() => this.fileList[i]);

        const absolutePath = file.absolutePath;

        try {
          const tagsNameHierarchies = await this.rootStore.exifTool.readTags(absolutePath);

          // Now that we know the tag names in file metadata, add them to the files in Allusion
          // Main idea: Find matching tag with same name, otherwise, insert new
          //   for now, just match by the name at the bottom of the hierarchy

          const { tagStore } = this.rootStore;
          for (const tagHierarchy of tagsNameHierarchies) {
            const match = tagStore.findByName(tagHierarchy[tagHierarchy.length - 1]);
            if (match) {
              // If there is a match to the leaf tag, just add it to the file
              file.addTag(match);
            } else {
              // If there is no direct match to the leaf, insert it in the tag hierarchy: first check if any of its parents exist
              let curTag = tagStore.root;
              for (const nodeName of tagHierarchy) {
                const nodeMatch = tagStore.findByName(nodeName);
                if (nodeMatch) {
                  curTag = nodeMatch;
                } else {
                  curTag = await tagStore.create(curTag, nodeName);
                }
              }
              file.addTag(curTag);
            }
          }
        } catch (e) {
          console.error('Could not import tags for', absolutePath, e);
        }
      }
      AppToaster.show(
        {
          message: 'Reading tags from files... Done!',
          timeout: 5000,
        },
        toastKey,
      );
    } catch (e) {
      console.error('Could not read tags', e);
      AppToaster.show(
        {
          message: 'Reading tags from files failed. Check the dev console for more details',
          timeout: 5000,
        },
        toastKey,
      );
    }
  }

  @action.bound async writeTagsToFiles() {
    const toastKey = 'write-tags-to-file';
    try {
      const numFiles = this.fileList.length;
      const tagFilePairs = runInAction(() =>
        this.fileList.map((f) => ({
          absolutePath: f.absolutePath,
          tagHierarchy: Array.from(
            f.tags,
            action((t) => t.path),
          ),
        })),
      );
      let lastToastVal = '0';
      for (let i = 0; i < tagFilePairs.length; i++) {
        const newToastVal = ((100 * i) / numFiles).toFixed(0);
        if (lastToastVal !== newToastVal) {
          lastToastVal = newToastVal;
          AppToaster.show(
            {
              message: `Writing tags to files ${newToastVal}%...`,
              timeout: 0,
            },
            toastKey,
          );
        }

        const { absolutePath, tagHierarchy } = tagFilePairs[i];
        try {
          await this.rootStore.exifTool.writeTags(absolutePath, tagHierarchy);
        } catch (e) {
          console.error('Could not write tags to', absolutePath, tagHierarchy, e);
        }
      }
      AppToaster.show(
        {
          message: 'Writing tags to files... Done!',
          timeout: 5000,
        },
        toastKey,
      );
    } catch (e) {
      console.error('Could not write tags', e);
      AppToaster.show(
        {
          message: 'Writing tags to files failed. Check the dev console for more details',
          timeout: 5000,
        },
        toastKey,
      );
    }
  }

  @action.bound switchOrderDirection() {
    this.orderDirection =
      this.orderDirection === OrderDirection.Desc ? OrderDirection.Asc : OrderDirection.Desc;
  }

  @action.bound orderFilesBy(prop: OrderBy<FileDTO> = 'dateAdded') {
    this.orderBy = prop;
  }

  /**
   * Marks file as missing
   *
   * Marking a file as missing will remove the file from the FileStore stats and
   * automatically 'freezes' the object. Freezing means that changes made to a
   * file will not be saved in the database.
   * @param file
   */
  @action.bound hideFile(file: ClientFile) {
    file.setBroken(true);
    this.rootStore.uiStore.deselectFile(file);
    this.#missingFiles.add(file.id);
    if (file.tags.size === 0) {
      this.decrementNumUntaggedFiles();
    }
  }

  /** Replaces a file's data when it is moved or renamed */
  @action.bound replaceMovedFile(file: ClientFile, newData: FileDTO) {
    if (this.index.has(file.id)) {
      file.dispose();

      const newIFile = mergeMovedFile(file.serialize(), newData);

      // Move thumbnail
      const { thumbnailDirectory } = this.rootStore.uiStore; // TODO: make a config store for this?
      const oldThumbnailPath = file.thumbnailPath.replace('?v=1', '');
      const newThumbPath = getThumbnailPath(newData.absolutePath, thumbnailDirectory);
      fse.move(oldThumbnailPath, newThumbPath).catch(() => {});

      const newClientFile = new ClientFile(this, newIFile);
      newClientFile.thumbnailPath = newThumbPath;
      this.index.insert(file.id, newClientFile);
      this.save(newClientFile.serialize());
    }
  }

  /** Removes a file from the internal state of this store and the DB. Does not remove from disk. */
  @action async deleteFiles(files: ClientFile[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    try {
      let removedFiles: ClientFile[];
      {
        // Remove from backend
        // Deleting non-exiting keys should not throw an error!
        const fileIDs = files.map((f) => f.id);
        await this.backend.removeFiles(fileIDs);

        // Remove files from stores
        const removedFileIDs = new Set(fileIDs);
        removedFiles = this.index.retain((file) => !removedFileIDs.has(file.id));
      }

      for (const file of removedFiles) {
        file.dispose();
        this.rootStore.uiStore.deselectFile(file);
        this.removeThumbnail(file.absolutePath);
      }
    } catch (err) {
      console.error('Could not remove files', err);
    }
  }

  @action async deleteFilesByExtension(ext: IMG_EXTENSIONS_TYPE): Promise<void> {
    try {
      const crit = new ClientStringSearchCriteria('extension', ext, 'equals');
      const files = await this.backend.searchFiles(crit.toCondition(), 'id', OrderDirection.Asc);
      console.log('Files to delete', ext, files);
      await this.backend.removeFiles(files.map((f) => f.id));

      for (const file of files) {
        this.removeThumbnail(file.absolutePath);
      }
    } catch (e) {
      console.error('Could not delete files bye extension', ext);
    }
  }

  *fetchAllFiles(): Generator<unknown, void, any> {
    try {
      const fetchedFiles: FileDTO[] = yield this.backend.fetchFiles(
        this.orderBy,
        this.orderDirection,
      );
      yield* this.updateFromBackend(fetchedFiles);
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  *fetchMissingFiles(): Generator<unknown, void, any> {
    try {
      const { orderBy, orderDirection } = this;

      // Fetch all files, then check their existence and only show the missing ones
      const backendFiles: FileDTO[] = yield this.backend.fetchFiles(orderBy, orderDirection);

      // For every new file coming in, either re-use the existing client file if it exists,
      // or construct a new client file
      this.#mergeFilesFromBackend(backendFiles);

      yield* this.#checkFileExistences();

      this.index.retain((file) => file.isBroken === true);
      this.cleanFileSelection();

      AppToaster.show(
        {
          message:
            'Some files can no longer be found. Either move them back to their location, or delete them from Allusion',
          timeout: 12000,
        },
        'recovery-view',
      );
    } catch (err) {
      console.error('Could not load broken files', err);
    }
  }

  *fetchFilesByQuery(
    criterias: [ConditionDTO<FileDTO>, ...ConditionDTO<FileDTO>[]],
    matchAny: boolean,
  ): Generator<unknown, void, any> {
    try {
      const fetchedFiles: FileDTO[] = yield this.backend.searchFiles(
        criterias,
        this.orderBy,
        this.orderDirection,
        matchAny,
      );
      yield* this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on criteria', e);
    }
  }

  *fetchFilesByIDs(files: ID[]): Generator<unknown, void, any> {
    try {
      const fetchedFiles: FileDTO[] = yield this.backend.fetchFilesByID(files);
      yield* this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on IDs', e);
    }
  }

  @action incrementNumUntaggedFiles(): void {
    this.numUntaggedFiles++;
  }

  @action decrementNumUntaggedFiles(): void {
    if (this.numUntaggedFiles === 0) {
      throw new Error('Invalid Database State: Cannot have less than 0 untagged files.');
    }
    this.numUntaggedFiles--;
  }

  // Removes all items from fileList
  @action clearFileList(): void {
    this.index.clear();
  }

  get(id: ID): ClientFile | undefined {
    return this.index.get(id);
  }

  getIndex(id: ID): number | undefined {
    return this.index.getIndex(id);
  }

  getTags(ids: ID[]): Set<ClientTag> {
    const tags = new Set<ClientTag>();
    for (const id of ids) {
      const tag = this.rootStore.tagStore.get(id);
      if (tag !== undefined) {
        tags.add(tag);
      }
    }
    return tags;
  }

  getLocation(location: ID): ClientLocation {
    const loc = this.rootStore.locationStore.get(location);
    if (!loc) {
      throw new Error(
        `Location of file was not found! This should never happen! Location ${location}`,
      );
    }
    return loc;
  }

  save(file: FileDTO) {
    file.dateModified = new Date();

    // Save files in bulk so saving many files at once is faster.
    // Each file will call this save() method individually after detecting a change on its observable fields,
    // these can be batched by collecting the changes and debouncing the save operation
    this.filesToSave.set(file.id, file);
    this.debouncedSaveFilesToSave();
  }

  private async saveFilesToSave() {
    const updatedFiles = Array.from(this.filesToSave.values());
    this.filesToSave.clear();
    await this.backend.saveFiles(updatedFiles);
  }

  @action recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(FILE_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        // BACKWARDS_COMPATIBILITY: orderDirection used to be called fileOrder
        const orderDirection = prefs.orderDirection ?? prefs.fileOrder;
        if (orderDirection === OrderDirection.Asc || orderDirection === OrderDirection.Desc) {
          this.orderDirection = orderDirection;
        }
        if (typeof prefs.orderBy === 'string') {
          this.orderBy = prefs.orderBy;
        }
      } catch (e) {
        console.error('Cannot parse persistent preferences:', FILE_STORAGE_KEY, e);
      }
    }
  }

  getPersistentPreferences(): Partial<Record<keyof FileStore, unknown>> {
    const preferences: Record<PersistentPreferenceFields, unknown> = {
      orderBy: this.orderBy,
      orderDirection: this.orderDirection,
    };
    return preferences;
  }

  clearPersistentPreferences() {
    localStorage.removeItem(FILE_STORAGE_KEY);
  }

  @action private async removeThumbnail(path: string) {
    const thumbnailPath = getThumbnailPath(path, this.rootStore.uiStore.thumbnailDirectory);
    try {
      if (await fse.pathExists(thumbnailPath)) {
        return fse.remove(thumbnailPath);
      }
    } catch (error) {
      // TODO: Show a notification that not all thumbnails could be removed?
      console.error(error);
    }
  }

  private *updateFromBackend(backendFiles: FileDTO[]): Generator<unknown, void, any> {
    const { uiStore, tagStore } = this.rootStore;

    if (backendFiles.length === 0) {
      uiStore.clearFileSelection();
      return this.index.clear();
    }

    // Filter out images with hidden tags
    // TODO: could also do it in search query, this is simpler though (maybe also more performant)
    if (tagStore.hiddenTagIDs.size > 0) {
      retainArray(backendFiles, (file) =>
        file.tags.every((tagID) => !tagStore.hiddenTagIDs.has(tagID)),
      );
    }

    // For every new file coming in, either re-use the existing client file if it exists,
    // or construct a new client file
    this.#mergeFilesFromBackend(backendFiles);
    this.cleanFileSelection();

    yield* this.#checkFileExistences();
  }

  // Check existence of new files.
  // We can simply check whether they exist after they start rendering.
  // TODO: We can already get this from chokidar (folder watching), pretty much for free
  *#checkFileExistences(): Generator<unknown, void, any> {
    // There is intentionally a max value to keep the chunk sizes small and avoid memory overhead.
    const NUM_PARALLEL_TASKS = clamp(navigator.hardwareConcurrency, 16, 64);
    const existenceCheckPromises = chunks(
      map(this.fileList, (file) => fse.pathExists(file.absolutePath)),
      NUM_PARALLEL_TASKS,
    );

    let index = 0;
    for (const chunk of existenceCheckPromises) {
      const existenceChecks: boolean[] = yield Promise.all(chunk);

      for (const exists of existenceChecks) {
        const file = this.fileList[index];

        if (exists) {
          file.setBroken(false);
          this.#missingFiles.delete(file.id);
        } else {
          file.setBroken(true);
          this.#missingFiles.add(file.id);
        }

        index += 1;
      }
    }
  }

  /** Remove files from selection that are not in the file list anymore */
  private cleanFileSelection() {
    const { fileSelection } = this.rootStore.uiStore;
    for (const file of fileSelection) {
      if (!this.index.has(file.id)) {
        fileSelection.delete(file);
      }
    }
  }

  /**
   * Merges client files with the backend files.
   *
   * If a client file exists with a corresponding backend file id, it will be updated with the backend file data.
   * Otherwise, a new client file will be created. Every client file with a non-matching backend file will be removed.
   * @param backendFiles The query results from the backend.
   */
  #mergeFilesFromBackend(backendFiles: FileDTO[]): void {
    const rootStore = this.rootStore;

    const mergeFile = (backendFile: FileDTO) => (existingFile: ClientFile | undefined) => {
      // Might already exist!
      if (existingFile !== undefined) {
        // Update tags (might have changes, e.g. removed/merged)
        const newTags = backendFile.tags
          .map((t) => rootStore.tagStore.get(t))
          .filter((t) => t !== undefined) as ClientTag[];
        if (
          existingFile.tags.size !== newTags.length ||
          Array.from(existingFile.tags).some((t, i) => t.id !== newTags[i].id)
        ) {
          existingFile.updateTagsFromBackend(newTags);
        }
        return existingFile;
      } else {
        // Otherwise, create new one.
        // TODO: Maybe better performance by always keeping the same pool of client files,
        // and just replacing their properties instead of creating new objects
        // But that's micro optimization...

        const file = new ClientFile(this, backendFile);
        // Initialize the thumbnail path so the image can be loaded immediately when it mounts.
        // To ensure the thumbnail actually exists, the `ensureThumbnail` function should be called
        file.thumbnailPath = this.rootStore.imageLoader.needsThumbnail(backendFile)
          ? getThumbnailPath(backendFile.absolutePath, this.rootStore.uiStore.thumbnailDirectory)
          : backendFile.absolutePath;
        return file;
      }
    };

    const disposedFiles = this.index.insertSort(
      map(backendFiles, (backendFile) => [backendFile.id, mergeFile(backendFile)]),
    );

    // Dispose of files that are not re-used to get rid of MobX observers.
    for (const file of disposedFiles) {
      file.dispose();
    }
  }

  /** Initializes the total and untagged file counters by querying the database with count operations */
  async refetchFileCounts(): Promise<void> {
    const [numTotalFiles, numUntaggedFiles] = await this.backend.countFiles();
    runInAction(() => {
      this.numUntaggedFiles = numUntaggedFiles;
      this.numTotalFiles = numTotalFiles;
    });
  }
}

export default FileStore;
