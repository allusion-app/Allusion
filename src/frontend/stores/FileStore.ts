import fse from 'fs-extra';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';

import { getThumbnailPath } from 'common/fs';
import { promiseAllLimit } from 'common/promise';
import { debounce } from 'common/timeout';
import { DataStorage } from '../../api/data-storage';
import { ConditionDTO, OrderBy, OrderDirection } from '../../api/data-storage-search';
import { FileDTO, IMG_EXTENSIONS_TYPE } from '../../api/file';
import { ID } from '../../api/id';
import { AppToaster } from '../components/Toaster';
import { ClientFile, mergeMovedFile } from '../entities/File';
import { ClientLocation } from '../entities/Location';
import { ClientStringSearchCriteria, ClientTagSearchCriteria } from '../entities/SearchCriteria';
import { ClientTag } from '../entities/Tag';
import RootStore from './RootStore';
import { ClientScore } from '../entities/Score';
import { Dimensions } from '@floating-ui/core';

export const FILE_STORAGE_KEY = 'Allusion_File';

/** These fields are stored and recovered when the application opens up */
type PersistentPreferenceFields =
  | 'orderDirection'
  | 'orderBy'
  | 'orderByScore'
  | 'averageFetchTimes';

export const enum Content {
  All,
  Missing,
  Untagged,
  Query,
}

class FileStore {
  private readonly backend: DataStorage;
  private readonly rootStore: RootStore;

  readonly fileList = observable<ClientFile | undefined>([]);
  /** Returns only the defined files from fileList */
  @computed get definedFiles(): ClientFile[] {
    return this.fileList.filter((clientFile): clientFile is ClientFile => !!clientFile);
  }
  /** Array that only contains the dimensions of the BackendFiles for faster masonry layout calculation */
  readonly fileDimensions = observable<Dimensions>([]);
  /**
   * The timestamp when the fileList was last modified.
   * Useful for in react component dependencies that need to trigger logic when the fileList changes
   */
  fileListLastModified = observable<Date>(new Date());
  /** A map of file ID to its index in the file list, for quick lookups by ID */
  private readonly index = new Map<ID, number>();

  private filesToSave: Map<ID, FileDTO> = new Map();

  /** The origin of the current files that are shown */
  @observable private content: Content = Content.All;
  @observable orderDirection: OrderDirection = OrderDirection.Desc;
  @observable orderBy: OrderBy<FileDTO> = 'dateAdded';
  @observable orderByScore: ID = '';
  @observable numTotalFiles = 0;
  @observable numLoadedFiles = 0;
  @observable numUntaggedFiles = 0;
  @observable numMissingFiles = 0;
  /**
   * ID pair for the current backend fetch task.
   * Helps identify if a new task has started and allows aborting previous ones.
   * - First element: fetch ID
   * - Second element: filesFromBackend ID
   * */
  readonly fetchTaskIdPair = observable<[number, number]>([0, 0]);
  readonly averageFetchTimes = observable(new Map<Content, number>([]));

  debouncedRefetch: () => void;
  debouncedSaveFilesToSave: () => Promise<void>;

  constructor(backend: DataStorage, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
    makeObservable(this);

    this.debouncedRefetch = debounce(this.refetch, 200).bind(this);
    this.debouncedSaveFilesToSave = debounce(this.saveFilesToSave, 100).bind(this);
    // reaction to keep updated properties "related" to fileList
  }

  @action.bound async readTagsFromFiles(): Promise<void> {
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
        if (!file) {
          continue;
        }

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
        try {
          const xmpScores = await this.rootStore.exifTool.readScores(absolutePath);
          const { scoreStore } = this.rootStore;
          for (const xmpScore of xmpScores) {
            const [encodedKey, encodedValue] = xmpScore.split('=');
            const name = decodeURIComponent(encodedKey);
            const value = Number(decodeURIComponent(encodedValue));
            const match = scoreStore.getByName(name);
            if (match) {
              // if already exists this score category set it to the file
              file.setScore(match, value);
            } else {
              // if not create a new score and set it to the file
              const newScore = await scoreStore.createScore(name);
              file.setScore(newScore, value);
            }
          }
        } catch (e) {
          console.error('Could not import scores for', absolutePath, e);
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

  @action.bound async writeTagsToFiles(): Promise<void> {
    const toastKey = 'write-tags-to-file';
    try {
      const numFiles = this.fileList.length;
      const tagFilePairs = runInAction(() =>
        this.definedFiles.map((f) => ({
          absolutePath: f.absolutePath,
          tagHierarchy: Array.from(
            f.tags,
            action((t) => t.path),
          ),
          scoreValues: Array.from(f.scores).map(
            ([s, value]) => `${encodeURIComponent(s.name)}=${value}`,
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

        const { absolutePath, tagHierarchy, scoreValues } = tagFilePairs[i];
        try {
          await this.rootStore.exifTool.writeTags(absolutePath, tagHierarchy, scoreValues);
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

  @action private setContent(content: Content): void {
    this.content = content;
    if (this.rootStore.uiStore.isSlideMode) {
      this.rootStore.uiStore.disableSlideMode();
    }
  }

  private setContentQuery(): void {
    this.setContent(Content.Query);
  }

  private setContentAll(): void {
    this.setContent(Content.All);
  }

  private setContentUntagged(): void {
    this.setContent(Content.Untagged);
  }

  private setContentMissing() {
    this.setContent(Content.Missing);
  }

  @computed get showsAllContent(): boolean {
    return this.content === Content.All;
  }

  @computed get showsUntaggedContent(): boolean {
    return this.content === Content.Untagged;
  }

  @computed get showsMissingContent(): boolean {
    return this.content === Content.Missing;
  }

  @computed get showsQueryContent(): boolean {
    return this.content === Content.Query;
  }

  @action.bound switchOrderDirection(): void {
    this.setOrderDirection(
      this.orderDirection === OrderDirection.Desc ? OrderDirection.Asc : OrderDirection.Desc,
    );
    this.refetch();
  }

  @action.bound orderFilesBy(prop: OrderBy<FileDTO> = 'dateAdded'): void {
    this.setOrderBy(prop);
    this.refetch();
  }

  @action.bound orderFilesByScore(prop: OrderBy<FileDTO> = 'dateAdded', score: ClientScore): void {
    this.setOrderBy(prop);
    this.setOrderByScore(score.id);
    this.refetch();
  }

  @action.bound setAverageFetchTime(content: Content, duration: number, numItems: number): void {
    // Avoid divide with 0
    duration = duration / (numItems || 1);
    const prev = this.averageFetchTimes.get(content) ?? duration;
    const average = (prev + duration) / 2;
    console.debug(
      `Adjusted average time for content type (${content}): avg: ${average} new: ${duration} prev: ${prev}`,
    );
    this.averageFetchTimes.set(content, average);
  }

  @action.bound setNumLoadedFiles(val: number): void {
    this.numLoadedFiles = val;
  }

  /**
   * Marks file as missing
   *
   * Marking a file as missing will remove the file from the FileStore stats and
   * automatically 'freezes' the object. Freezing means that changes made to a
   * file will not be saved in the database.
   * @param file
   */
  @action.bound hideFile(file: ClientFile): void {
    file.setBroken(true);
    this.rootStore.uiStore.deselectFile(file);
    this.incrementNumMissingFiles();
    if (file.tags.size === 0) {
      this.decrementNumUntaggedFiles();
    }
  }

  /** Replaces a file's data when it is moved or renamed */
  @action.bound replaceMovedFile(file: ClientFile, newData: FileDTO): void {
    const index = this.index.get(file.id);
    if (index !== undefined) {
      file.dispose();

      const newIFile = mergeMovedFile(file.serialize(), newData);

      // Move thumbnail
      const { thumbnailDirectory } = this.rootStore.uiStore; // TODO: make a config store for this?
      const oldThumbnailPath = file.thumbnailPath.split('?')[0];
      const newThumbPath = getThumbnailPath(newData.absolutePath, thumbnailDirectory);
      fse
        .move(oldThumbnailPath, newThumbPath)
        .catch((err) => console.error('Error moving file:', err));

      const newClientFile = new ClientFile(this, newIFile);
      newClientFile.thumbnailPath = newThumbPath;
      this.fileList[index] = newClientFile;
      this.save(newClientFile.serialize());
    }
  }

  /** Removes a file from the internal state of this store and the DB. Does not remove from disk. */
  @action async deleteFiles(files: ClientFile[]): Promise<void> {
    if (files.length === 0) {
      return;
    }

    try {
      // Remove from backend
      // Deleting non-exiting keys should not throw an error!
      await this.backend.removeFiles(files.map((f) => f.id));

      // Remove files from stores
      for (const file of files) {
        file.dispose();
        this.rootStore.uiStore.deselectFile(file);
        this.removeThumbnail(file.absolutePath);
      }
      this.fileListLastModified = new Date();
      return this.refetch();
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

  /**
   * Resets the number of loaded files and updates the first element
   * of `fetchTaskIdPair` with the current timestamp to uniquely identify the task.
   * @returns The generated fetch ID (timestamp)
   */
  @action.bound newFetchTaskId(): number {
    this.numLoadedFiles = 0;
    const now = performance.now();
    this.fetchTaskIdPair[0] = now;
    return now;
  }

  @action.bound async refetch(): Promise<void> {
    if (this.showsAllContent) {
      return this.fetchAllFiles();
    } else if (this.showsUntaggedContent) {
      return this.fetchUntaggedFiles();
    } else if (this.showsQueryContent) {
      return this.fetchFilesByQuery();
    } else if (this.showsMissingContent) {
      return this.fetchMissingFiles();
    }
  }

  @action.bound async fetchAllFiles(): Promise<void> {
    try {
      this.setContentAll();
      // Indicate a new fetch process
      const start = this.newFetchTaskId();
      this.rootStore.uiStore.clearSearchCriteriaList();
      const fetchedFiles = await this.backend.fetchFiles(
        this.orderBy,
        this.orderDirection,
        this.orderByScore,
      );
      const end = performance.now();
      this.setAverageFetchTime(Content.All, end - start, fetchedFiles.length);
      // continue if the current taskId is the same else abort the fetch
      const currentFetchId = runInAction(() => this.fetchTaskIdPair[0]);
      if (start === currentFetchId) {
        return this.updateFromBackend(fetchedFiles);
      } else {
        console.debug('FETCH All ABORTED');
      }
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound async fetchUntaggedFiles(): Promise<void> {
    try {
      this.setContentUntagged();
      // Indicate a new fetch process
      const start = this.newFetchTaskId();
      const { uiStore } = this.rootStore;
      uiStore.clearSearchCriteriaList();
      const criteria = new ClientTagSearchCriteria('tags');
      uiStore.searchCriteriaList.push(criteria);
      const fetchedFiles = await this.backend.searchFiles(
        criteria.toCondition(this.rootStore),
        this.orderBy,
        this.orderDirection,
        this.orderByScore,
        uiStore.searchMatchAny,
      );
      const end = performance.now();
      this.setAverageFetchTime(Content.Untagged, end - start, fetchedFiles.length);
      // continue if the current taskId is the same else abort the fetch
      const currentFetchId = runInAction(() => this.fetchTaskIdPair[0]);
      if (start === currentFetchId) {
        return this.updateFromBackend(fetchedFiles);
      } else {
        console.debug('FETCH UNTAGGED ABORTED');
      }
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound async fetchMissingFiles(): Promise<void> {
    try {
      const {
        orderBy,
        orderDirection,
        orderByScore,
        rootStore: { uiStore },
      } = this;

      this.setContentMissing();
      // Indicate a new fetch process
      const start = this.newFetchTaskId();
      uiStore.clearSearchCriteriaList();

      // Fetch all files, then check their existence and only show the missing ones
      // Similar to {@link updateFromBackend}, but the existence check needs to be awaited before we can show the images
      const backendFiles = await this.backend.fetchFiles(orderBy, orderDirection, orderByScore);
      const end = performance.now();
      this.setAverageFetchTime(Content.All, end - start, backendFiles.length);
      // continue if the current taskId is the same else abort the fetch
      const currentFetchId = runInAction(() => this.fetchTaskIdPair[0]);
      if (!(start === currentFetchId)) {
        console.debug('FETCH MISSING ABORTED');
        return;
      }

      // For every new file coming in, either re-use the existing client file if it exists,
      // or construct a new client file
      const { newFiles, status } = await this.filesFromBackend(backendFiles, false);
      if (status != Status.success) {
        return;
      }

      // We don't store whether files are missing (since they might change at any time)
      // So we have to check all files and check their existence them here
      const existenceCheckPromises = runInAction(() => {
        this.numLoadedFiles = 0;
        const definedFiles = newFiles.filter(
          (clientFile): clientFile is ClientFile => !!clientFile,
        );
        const total = definedFiles.length;
        const step = Math.ceil(total / 20);

        return definedFiles.map((clientFile, i) => async () => {
          const exists = await fse.pathExists(clientFile.absolutePath);
          clientFile.setBroken(!exists);
          if (i % step === 0 || i === total - 1) {
            this.setNumLoadedFiles(i);
          }
        });
      });

      const N = 50; // TODO: same here as in fetchFromBackend: number of concurrent checks should be system dependent
      await promiseAllLimit(existenceCheckPromises, N);
      // If filesFromBackend was aborted or the user changed the content while checking for
      // missing files, do not replace the fileList
      const [content, currentFetchId2] = runInAction(() => [this.content, this.fetchTaskIdPair[0]]);
      if (content !== Content.Missing || !(start === currentFetchId2)) {
        console.debug('FETCH MISSING ABORTED');
        return;
      }

      runInAction(() => {
        const missingClientFiles = newFiles.filter((file) => file && file.isBroken);
        this.replaceFileList(missingClientFiles);
        this.numMissingFiles = missingClientFiles.length;
        this.fileListLastModified = new Date();
      });
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

  @action.bound async fetchFilesByQuery(): Promise<void> {
    const { uiStore } = this.rootStore;

    if (uiStore.searchCriteriaList.length === 0) {
      return this.fetchAllFiles();
    }

    const criterias = uiStore.searchCriteriaList.map((c) => c.toCondition(this.rootStore));
    try {
      this.setContentQuery();
      // Indicate a new fetch process
      const start = this.newFetchTaskId();
      const fetchedFiles = await this.backend.searchFiles(
        criterias as [ConditionDTO<FileDTO>, ...ConditionDTO<FileDTO>[]],
        this.orderBy,
        this.orderDirection,
        this.orderByScore,
        uiStore.searchMatchAny,
      );
      const end = performance.now();
      this.setAverageFetchTime(Content.Query, end - start, fetchedFiles.length);
      // continue if the current taskId is the same else abort the fetch
      const currentFetchId = runInAction(() => this.fetchTaskIdPair[0]);
      if (start === currentFetchId) {
        return this.updateFromBackend(fetchedFiles);
      } else {
        console.debug('FETCH BY QUERY ABORTED');
      }
    } catch (e) {
      console.log('Could not find files based on criteria', e);
    }
  }

  @action.bound incrementNumUntaggedFiles(): void {
    this.numUntaggedFiles++;
  }

  @action.bound decrementNumUntaggedFiles(): void {
    if (this.numUntaggedFiles === 0) {
      throw new Error('Invalid Database State: Cannot have less than 0 untagged files.');
    }
    this.numUntaggedFiles--;
  }

  // Removes all items from fileList
  @action.bound clearFileList(): void {
    this.numLoadedFiles = 0;
    this.fileDimensions.clear();
    this.fileList.clear();
    this.index.clear();
  }

  /**
   * Replaces the current file list with a new one and updates:
   * - Dimensions (defaulting to 100x100 if undefined)
   * - Index mapping from file ID to its position
   * - Count of loaded (defined) files
   */
  @action.bound replaceFileList(newFiles: (ClientFile | undefined)[]): void {
    this.fileList.replace(newFiles);
    this.fileDimensions.replace(
      this.fileList.map((f) => ({
        width: f ? f.width : 100,
        height: f ? f.height : 100,
      })),
    );
    this.index.clear();
    for (let index = 0; index < this.fileList.length; index++) {
      const file = this.fileList[index];
      if (file) {
        this.index.set(file.id, index);
      }
    }
    this.numLoadedFiles = this.definedFiles.length;
  }

  @action get(id: ID): ClientFile | undefined {
    const fileIndex = this.index.get(id);
    return fileIndex !== undefined ? this.fileList[fileIndex] : undefined;
  }

  getIndex(id: ID): number | undefined {
    return this.index.get(id);
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

  getScores(dtoScores: Map<ID, number>): Map<ClientScore, number> {
    const scores = new Map<ClientScore, number>();
    for (const [id, value] of dtoScores.entries()) {
      const clientScore = this.rootStore.scoreStore.get(id);
      if (clientScore !== undefined) {
        scores.set(clientScore, value);
      }
    }
    return scores;
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

  save(file: FileDTO): void {
    file.dateModified = new Date();

    // Save files in bulk so saving many files at once is faster.
    // Each file will call this save() method individually after detecting a change on its observable fields,
    // these can be batched by collecting the changes and debouncing the save operation
    this.filesToSave.set(file.id, file);
    this.debouncedSaveFilesToSave();
  }

  private async saveFilesToSave() {
    await this.backend.saveFiles(Array.from(this.filesToSave.values()));
    this.filesToSave.clear();
  }

  @action recoverPersistentPreferences(): void {
    const prefsString = localStorage.getItem(FILE_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        // BACKWARDS_COMPATIBILITY: orderDirection used to be called fileOrder
        this.setOrderDirection(prefs.orderDirection ?? prefs.fileOrder);
        this.setOrderBy(prefs.orderBy);
        if (prefs.orderByScore) {
          this.setOrderByScore(prefs.orderByScore);
        }
        if (prefs.averageFetchTimes) {
          this.averageFetchTimes.replace(new Map(prefs.averageFetchTimes));
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
      orderByScore: this.orderByScore,
      averageFetchTimes: Array.from(this.averageFetchTimes.entries()),
    };
    return preferences;
  }

  clearPersistentPreferences(): void {
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

  @action async updateFromBackend(backendFiles: FileDTO[]): Promise<void> {
    if (backendFiles.length === 0) {
      this.rootStore.uiStore.clearFileSelection();
      this.fileListLastModified = new Date();
      return this.clearFileList();
    }

    // Filter out images with hidden tags
    // TODO: could also do it in search query, this is simpler though (maybe also more performant)
    const hiddenTagIds = new Set(
      this.rootStore.tagStore.tagList.filter((t) => t.isHidden).map((t) => t.id),
    );
    backendFiles = backendFiles.filter((f) => !f.tags.some((t) => hiddenTagIds.has(t)));
    this.fileDimensions.replace(
      backendFiles.map((bf) => ({
        width: bf.width,
        height: bf.height,
      })),
    );

    // For every new file coming in, either re-use the existing client file if it exists,
    // or construct a new client file
    const { status } = await this.filesFromBackend(backendFiles, true);
    if (status != Status.success) {
      return;
    }

    // Check existence of new files asynchronously, no need to wait until they can be shown
    // we can simply check whether they exist after they start rendering
    // TODO: We can already get this from chokidar (folder watching), pretty much for free
    const existenceCheckPromises = runInAction(() => {
      return this.definedFiles.map((clientFile) => async () => {
        const exists = await fse.pathExists(clientFile.absolutePath);
        clientFile.setBroken(!exists);
      });
    });

    // Run the existence check with at most N checks in parallel
    // TODO: Should make N configurable, or determine based on the system/disk performance
    // NOTE: This is _not_ await intentionally, since we want to show the files to the user as soon as possible
    runInAction(() => {
      this.cleanFileSelection();
      this.updateFileListState(); // update index & untagged image counter
      this.fileListLastModified = new Date();
    });
    const N = 50;
    return promiseAllLimit(existenceCheckPromises, N)
      .then(() => {
        this.updateFileListState(); // update missing image counter
      })
      .catch((e) => console.error('An error occured during existence checking!', e));
  }

  /** Remove files from selection that are not in the file list anymore */
  @action private cleanFileSelection() {
    const { fileSelection } = this.rootStore.uiStore;
    for (const file of fileSelection) {
      if (!this.index.has(file.id)) {
        fileSelection.delete(file);
      }
    }
  }

  /**
   * Populates "fileList" and "index" with backendFiles, reusing existing ClientFiles when possible,
   * else creating new ones and disposes unused files.
   *
   * Files are processed in prioritized batches, favoring the batch nearest to uiStore.firstItem
   *
   * @param backendFiles Array of files from the backend to process.
   * @param updateObservable If true, updates the `fileList` observable and `index`, if false, still disposes unused files.
   * @param batchSize Number of files to process per batch (default: 256).
   * @returns The processed file list, index and status result.
   */
  @action private async filesFromBackend(
    backendFiles: FileDTO[],
    updateObservable = true,
    batchSize = 256,
  ): Promise<{
    newFiles: (ClientFile | undefined)[];
    newIndex: Map<string, number>;
    status: Status;
  }> {
    // get current task Id and update the sub Id
    const taskId: [number, number] = [this.fetchTaskIdPair[0], performance.now()];
    this.fetchTaskIdPair[1] = taskId[1];

    // Copy of the current fileList and index to process reused and dispose unused ClienFiles
    // if updateObservables is false use as reference the original observables to avoid creating unnecessary copies
    const transitionFileList = updateObservable ? this.fileList.slice() : this.fileList;
    const transitionIndex = updateObservable ? new Map(this.index) : this.index;
    const newArray = new Array<ClientFile | undefined>(backendFiles.length);
    const targetList = updateObservable ? this.fileList : newArray;
    const targeIndex = updateObservable ? this.index : new Map<string, number>();
    if (updateObservable) {
      this.fileList.replace(newArray);
      targeIndex.clear();
    }
    this.numLoadedFiles = 0;
    const reusedStatus = new Set<ID>();
    let status: Status = Status.success;
    const initialIndex = this.rootStore.uiStore.firstItem;
    const total = backendFiles.length;

    // Calculate number of Batches and its order, prioritizing batches closer to the initialIndex;
    // calculate the initial batch to process with initilIndex at his center.
    const initialBatchStart = initialIndex - Math.floor(batchSize / 2);
    const initialBatchIndex = Math.ceil(initialBatchStart / batchSize);
    // Absolute start of the batches, it can be negative because of the offset when centering the initialIndex
    // and it's used to calculate other batches with the offset
    const absoluteBatchStart = initialBatchStart - batchSize * initialBatchIndex;
    const totalBatches = Math.ceil((total - absoluteBatchStart) / batchSize);
    const batchOrder: number[] = [];
    for (let offset = 0; batchOrder.length < totalBatches; offset++) {
      const before = initialBatchIndex - offset;
      const after = initialBatchIndex + offset;
      if (offset === 0) {
        batchOrder.push(initialBatchIndex);
      } else {
        if (after < totalBatches) {
          batchOrder.push(after);
        }
        if (before >= 0) {
          batchOrder.push(before);
        }
      }
    }

    for (const batchIndex of batchOrder) {
      // calculate and truncate batch boundaries to valid array range
      const rawStart = absoluteBatchStart + batchIndex * batchSize;
      const start = Math.max(rawStart, 0);
      const end = Math.min(rawStart + batchSize - 1, total - 1);

      runInAction(() => {
        for (let i = start; i <= end; i++) {
          //Stop processing the batch if FFBETaskIds changed
          if (taskId[0] !== this.fetchTaskIdPair[0] || taskId[1] !== this.fetchTaskIdPair[1]) {
            status = Status.aborted;
            break;
          }
          const f = backendFiles[i];
          const idx = i;
          // Might already exist!
          const eFileIndex = transitionIndex.get(f.id);
          const existingFile =
            eFileIndex !== undefined ? transitionFileList[eFileIndex] : undefined;
          if (existingFile) {
            reusedStatus.add(existingFile.id);
            // Update tags (might have changes, e.g. removed/merged)
            const newTags: ClientTag[] = [];
            for (const tagId of f.tags) {
              const tag = this.rootStore.tagStore.get(tagId);
              if (tag) {
                newTags.push(tag);
              }
            }
            if (
              existingFile.tags.size !== newTags.length ||
              Array.from(existingFile.tags).some((t, i) => t.id !== newTags[i].id)
            ) {
              existingFile.updateTagsFromBackend(newTags);
            }
            // Update scores (might have changes, e.g. removed)
            const newScores = new Map<ClientScore, number>();
            for (const [id, value] of f.scores.entries()) {
              const clientScore = this.rootStore.scoreStore.get(id);
              if (clientScore) {
                newScores.set(clientScore, value);
              }
            }
            if (
              existingFile.scores.size !== newScores.size ||
              Array.from(existingFile.scores).some((t) => t[1] !== newScores.get(t[0]))
            ) {
              existingFile.updateScoresFromBackend(newScores);
            }
            targetList[idx] = existingFile;
            targeIndex.set(existingFile.id, idx);
            this.numLoadedFiles++;
          } else {
            // Otherwise, create new one.
            // TODO: Maybe better performance by always keeping the same pool of client files,
            // and just replacing their properties instead of creating new objects
            // But that's micro optimization...
            const file = new ClientFile(this, f);
            // Initialize the thumbnail path so the image can be loaded immediately when it mounts.
            // To ensure the thumbnail actually exists, the `ensureThumbnail` function should be called
            runInAction(() => {
              file.setThumbnailPath(
                this.rootStore.imageLoader.needsThumbnail(f)
                  ? getThumbnailPath(f.absolutePath, this.rootStore.uiStore.thumbnailDirectory)
                  : f.absolutePath,
              );
            });
            targetList[idx] = file;
            targeIndex.set(file.id, idx);
            this.numLoadedFiles++;
          }
        }
      });
      //Stop processing all batches if this promise is aborted
      if (status.valueOf() === Status.aborted) {
        console.debug('FILES FROM BACKEND ABORTED');
        break;
      }

      // Wait to allow mobx reaction to complete and propagated changes to fileList and index
      // if initial batch wait more to ensure it's propagated before the next batch
      const delay = batchIndex === initialBatchIndex ? 500 : 0;
      await new Promise((r) => setTimeout(r, delay));
    }

    runInAction(() => {
      // Ensure numLoadedFiles is not bigger than the total of files, this can happen when
      // this funcion is called again before finishing or aborting the previous one.
      if (this.numLoadedFiles > targetList.length) {
        this.numLoadedFiles = targetList.length;
      }
      // Dispose of Clientfiles that are not re-used (to get rid of MobX observers)
      for (const file of transitionFileList) {
        if (file && !reusedStatus.has(file.id)) {
          file.dispose();
        }
      }
    });
    return { newFiles: targetList, newIndex: targeIndex, status: status };
  }

  /** Derive fields from `fileList`
   * - `index`
   * - `numUntaggedFiles`
   * - `numMissingFiles`
   */
  @action private updateFileListState() {
    let missingFiles = 0;
    let untaggedFiles = 0;
    this.index.clear();
    for (let index = 0; index < this.fileList.length; index++) {
      const file = this.fileList[index];
      if (!file) {
        continue;
      }
      if (file.isBroken) {
        missingFiles += 1;
      } else if (file.tags.size === 0) {
        untaggedFiles += 1;
      }
      this.index.set(file.id, index);
    }
    this.numMissingFiles = missingFiles;
    if (this.showsAllContent) {
      this.numTotalFiles = this.fileList.length;
      this.numUntaggedFiles = untaggedFiles;
    } else if (this.showsUntaggedContent) {
      this.numUntaggedFiles = this.fileList.length;
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

  @action private setOrderDirection(order: OrderDirection) {
    this.orderDirection = order;
  }

  @action private setOrderBy(prop: OrderBy<FileDTO> = 'dateAdded') {
    this.orderBy = prop;
  }

  @action private setOrderByScore(scoreId: ID = '') {
    this.orderByScore = scoreId;
  }

  @action private incrementNumMissingFiles() {
    this.numMissingFiles++;
  }
}

enum Status {
  success = 'success',
  error = 'error',
  aborted = 'aborted',
}

export default FileStore;
