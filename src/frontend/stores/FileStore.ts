import { action, observable, computed, observe, runInAction, makeObservable } from 'mobx';
import fse from 'fs-extra';

import Backend from 'src/backend/Backend';
import { FileOrder } from 'src/backend/DBRepository';

import { ID, generateId } from 'src/entities/ID';
import { ClientFile, IFile, getMetaData } from 'src/entities/File';
import { ClientLocation } from 'src/entities/Location';
import { SearchCriteria, ClientTagSearchCriteria } from 'src/entities/SearchCriteria';
import { ClientTag } from 'src/entities/Tag';

import RootStore from './RootStore';

import { getThumbnailPath, debounce, needsThumbnail, promiseAllLimit } from '../utils';
import ExifIO from 'src/backend/ExifIO';
import { AppToaster } from '../components/Toaster';

const FILE_STORAGE_KEY = 'Allusion_File';

/** These fields are stored and recovered when the application opens up */
const PersistentPreferenceFields: Array<keyof FileStore> = ['fileOrder', 'orderBy'];

const enum Content {
  All,
  Missing,
  Untagged,
  Query,
}

class FileStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  public exifTool: ExifIO;

  readonly fileList = observable<ClientFile>([]);
  /**
   * The timestamp when the fileList was last modified.
   * Useful for in react component dependencies that need to trigger logic when the fileList changes
   */
  fileListLastModified = observable<Date>(new Date());
  /** A map of file ID to its index in the file list, for quick lookups by ID */
  private readonly index = new Map<ID, number>();

  /** The origin of the current files that are shown */
  @observable private content: Content = Content.All;
  @observable fileOrder: FileOrder = FileOrder.Desc;
  @observable orderBy: keyof IFile = 'dateAdded';
  @observable numTotalFiles = 0;
  @observable numUntaggedFiles = 0;
  @observable numMissingFiles = 0;

  debouncedRefetch: () => void;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;
    makeObservable(this);

    // Store preferences immediately when anything is changed
    const debouncedPersist = debounce(this.storePersistentPreferences, 200).bind(this);
    this.debouncedRefetch = debounce(this.refetch, 200).bind(this);
    PersistentPreferenceFields.forEach((f) => observe(this, f, debouncedPersist));

    this.exifTool = new ExifIO();
  }

  @action.bound async readTagsFromFiles() {
    const toastKey = 'read-tags-from-file';
    try {
      await this.exifTool.initialize();
      const numFiles = runInAction(() => this.fileList.length);
      for (let i = 0; i < numFiles; i++) {
        AppToaster.show(
          {
            message: `Reading tags from files ${((100 * i++) / numFiles).toFixed(0)}%...`,
            timeout: 0,
          },
          toastKey,
        );

        const absolutePath = runInAction(() => this.fileList[i].absolutePath);
        const tagsNameHierarchies = await this.exifTool.readTags(absolutePath);

        // Now that we know the tag names in file metadata, add them to the files in Allusion
        // Main idea: Find matching tag with same name, otherwise, insert new
        //   for now, just match by the name at the bottom of the hierarchy
        // TODO: We need a "merge" option for two or more tags in tag context menu

        const { tagStore } = this.rootStore;
        for (const tagHierarchy of tagsNameHierarchies) {
          const match = runInAction(() =>
            tagStore.tagList.find((t) => t.name === tagHierarchy[tagHierarchy.length - 1]),
          );
          if (match) {
            runInAction(() => this.fileList[i].addTag(match));
          } else {
            let curTag = tagStore.root;
            for (const newTagName of tagHierarchy) {
              const newTag = await tagStore.create(curTag, newTagName);
              curTag = newTag;
            }
            runInAction(() => this.fileList[i].addTag(curTag));
          }
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
    } finally {
      await this.exifTool.close();
    }
  }

  @action.bound async writeTagsToFiles() {
    const toastKey = 'write-tags-to-file';
    try {
      await this.exifTool.initialize();
      const numFiles = runInAction(() => this.fileList.length);
      for (let i = 0; i < numFiles; i++) {
        AppToaster.show(
          {
            message: `Writing tags to files ${((100 * i++) / numFiles).toFixed(0)}%...`,
            timeout: 0,
          },
          toastKey,
        );
        const [absolutePath, tagNameHierarchy] = runInAction(() => {
          const file = this.fileList[i];
          return [
            file.absolutePath,
            Array.from(file.tags).map((t) => t.getTagHierarchy().map((t) => t.name)),
          ];
        });
        await this.exifTool.writeTags(absolutePath, tagNameHierarchy);
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
    } finally {
      this.exifTool.close();
    }
  }

  @computed get showsAllContent() {
    return this.content === Content.All;
  }

  @computed get showsUntaggedContent() {
    return this.content === Content.Untagged;
  }

  @computed get showsMissingContent() {
    return this.content === Content.Missing;
  }

  @computed get showsQueryContent() {
    return this.content === Content.Query;
  }

  @action.bound switchFileOrder() {
    this.setFileOrder(this.fileOrder === FileOrder.Desc ? FileOrder.Asc : FileOrder.Desc);
    this.refetch();
  }

  @action.bound orderFilesBy(prop: keyof IFile = 'dateAdded') {
    this.setOrderBy(prop);
    this.refetch();
  }

  @action.bound setContentQuery() {
    this.content = Content.Query;
    if (this.rootStore.uiStore.isSlideMode) this.rootStore.uiStore.disableSlideMode();
  }

  @action.bound setContentAll() {
    this.content = Content.All;
    if (this.rootStore.uiStore.isSlideMode) this.rootStore.uiStore.disableSlideMode();
  }

  @action.bound setContentUntagged() {
    this.content = Content.Untagged;
    if (this.rootStore.uiStore.isSlideMode) this.rootStore.uiStore.disableSlideMode();
  }

  @action.bound async importExternalFile(path: string, dateAdded: Date) {
    const loc = this.rootStore.locationStore.locationList[0]; // TODO: User should pick location
    const file = new ClientFile(this, {
      id: generateId(),
      locationId: loc.id,
      absolutePath: path,
      relativePath: path.replace(loc.path, ''),
      dateAdded,
      dateModified: new Date(),
      tags: [],
      ...(await getMetaData(path)),
    });
    // The function caller is responsible for handling errors.
    await this.backend.createFile(file.serialize());
    runInAction(() => {
      this.index.set(file.id, this.fileList.length);
      this.fileList.push(file);
    });
    this.incrementNumUntaggedFiles();
    return file;
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
    this.incrementNumMissingFiles();
    if (file.tags.size === 0) {
      this.decrementNumUntaggedFiles();
    }
  }

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
        this.rootStore.uiStore.deselectFile(file);
        this.removeThumbnail(file.absolutePath);
      }
      this.refetch();
    } catch (err) {
      console.error('Could not remove files', err);
    }
  }

  @action.bound refetch() {
    if (this.showsAllContent) {
      this.fetchAllFiles();
    } else if (this.showsUntaggedContent) {
      this.fetchUntaggedFiles();
    } else if (this.showsQueryContent) {
      this.fetchFilesByQuery();
    } else if (this.showsMissingContent) {
      this.fetchMissingFiles();
    }
  }

  @action.bound async fetchAllFiles() {
    try {
      this.rootStore.uiStore.clearSearchCriteriaList();
      const fetchedFiles = await this.backend.fetchFiles(this.orderBy, this.fileOrder);
      this.setContentAll();
      return this.updateFromBackend(fetchedFiles);
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound async fetchUntaggedFiles() {
    try {
      const { uiStore } = this.rootStore;
      uiStore.clearSearchCriteriaList();
      const criteria = new ClientTagSearchCriteria(this.rootStore.tagStore, 'tags');
      uiStore.searchCriteriaList.push(criteria);
      const fetchedFiles = await this.backend.searchFiles(
        criteria.serialize(),
        this.orderBy,
        this.fileOrder,
        uiStore.searchMatchAny,
      );
      this.setContentUntagged();
      return this.updateFromBackend(fetchedFiles);
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound async fetchMissingFiles() {
    try {
      const {
        orderBy,
        fileOrder,
        rootStore: { uiStore },
      } = this;

      uiStore.searchCriteriaList.clear();
      this.setContentMissing();

      // Fetch all files, then check their existence and only show the missing ones
      // Similar to {@link updateFromBackend}, but the existence check needs to be awaited before we can show the images
      const backendFiles = await this.backend.fetchFiles(orderBy, fileOrder);

      // For every new file coming in, either re-use the existing client file if it exists,
      // or construct a new client file
      const [newClientFiles, reusedStatus] = this.filesFromBackend(backendFiles);

      // Dispose of unused files
      runInAction(() => {
        for (const oldFile of this.fileList) {
          if (!reusedStatus.has(oldFile.id)) {
            oldFile.dispose();
          }
        }
      });

      // We don't store whether files are missing (since they might change at any time)
      // So we have to check all files and check their existence them here
      const existenceCheckPromises = newClientFiles.map((clientFile) => async () => {
        clientFile.setBroken(!(await fse.pathExists(clientFile.absolutePath)));
      });

      const N = 50; // TODO: same here as in fetchFromBackend: number of concurrent checks should be system dependent
      await promiseAllLimit(existenceCheckPromises, N);

      runInAction(() => {
        const missingClientFiles = newClientFiles.filter((file) => file.isBroken);
        this.fileList.replace(missingClientFiles);
        this.numMissingFiles = missingClientFiles.length;
        this.index.clear();
        for (let index = 0; index < this.fileList.length; index++) {
          const file = this.fileList[index];
          this.index.set(file.id, index);
        }
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

  @action.bound async fetchFilesByQuery() {
    const { uiStore } = this.rootStore;
    const criteria = this.rootStore.uiStore.searchCriteriaList.map((c) => c.serialize());
    if (criteria.length === 0) {
      return this.fetchAllFiles();
    }
    try {
      const fetchedFiles = await this.backend.searchFiles(
        criteria as [SearchCriteria<IFile>],
        this.orderBy,
        this.fileOrder,
        uiStore.searchMatchAny,
      );
      this.setContentQuery();
      return this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on criteria', e);
    }
  }

  @action.bound async fetchFilesByIDs(files: ID[]) {
    try {
      const fetchedFiles = await this.backend.fetchFilesByID(files);
      return this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on IDs', e);
    }
  }

  @action.bound incrementNumUntaggedFiles() {
    this.numUntaggedFiles++;
  }

  @action.bound decrementNumUntaggedFiles() {
    if (this.numUntaggedFiles === 0) {
      throw new Error('Invalid Database State: Cannot have less than 0 untagged files.');
    }
    this.numUntaggedFiles--;
  }

  // Removes all items from fileList
  @action.bound clearFileList() {
    this.fileList.clear();
    this.index.clear();
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

  getLocation(location: ID): ClientLocation {
    const loc = this.rootStore.locationStore.get(location);
    if (!loc) {
      throw new Error(
        `Location of file was not found! This should never happen! Location ${location}`,
      );
    }
    return loc;
  }

  save(file: IFile) {
    file.dateModified = new Date();
    this.backend.saveFile(file);
  }

  @action recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(FILE_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        this.setFileOrder(prefs.fileOrder);
        this.setOrderBy(prefs.orderBy);
      } catch (e) {
        console.log('Cannot parse persistent preferences:', FILE_STORAGE_KEY, e);
      }
    }
  }

  @action storePersistentPreferences() {
    const prefs: any = {};
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(prefs));
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

  @action private async updateFromBackend(backendFiles: IFile[]): Promise<void> {
    if (backendFiles.length === 0) {
      this.rootStore.uiStore.clearFileSelection();
      this.fileListLastModified = new Date();
      return this.clearFileList();
    }

    const locationIds = this.rootStore.locationStore.locationList.map((l) => l.id);

    // For every new file coming in, either re-use the existing client file if it exists,
    // or construct a new client file
    const [newClientFiles, reusedStatus] = this.filesFromBackend(backendFiles);

    // Dispose of Client files that are not re-used
    for (const file of this.fileList) {
      if (!reusedStatus.has(file.id)) {
        file.dispose();
      }
    }

    // Check existence of new files asynchronously, no need to wait until they can be showed
    // we can simply check whether they exist after they start rendering
    const existenceCheckPromises = newClientFiles.map((clientFile) => async () => {
      clientFile.setBroken(!(await fse.pathExists(clientFile.absolutePath)));

      // TODO: DEBUG CHECK. Remove this when going out for release version
      // Check if file belongs to a location; shouldn't be needed, but useful for during development
      if (!locationIds.includes(clientFile.locationId)) {
        console.warn(
          'DEBUG: Found a file that does not belong to any location! Will still show up. SHOULD NEVER HAPPEN',
          clientFile,
        );
      }
    });

    // Run the existence check with at most N checks in parallel
    // TODO: Should make N configurable, or determine based on the system/disk performance
    // NOTE: This is _not_ await intentionally, since we want to show the files to the user as soon as possible
    runInAction(() => {
      this.fileList.replace(newClientFiles);
      this.fileListLastModified = new Date();
    });
    const N = 50;
    return promiseAllLimit(existenceCheckPromises, N)
      .then(() => {
        this.updateFileListState();
        this.cleanFileSelection();
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
   *
   * @param backendFiles
   * @returns A list of Client files, and a set of keys that was reused from the existing fileList
   */
  @action private filesFromBackend(backendFiles: IFile[]): [ClientFile[], Set<ID>] {
    const reusedStatus = new Set<ID>();

    const clientFiles = backendFiles.map((f) => {
      // Might already exist!
      const existingFile = this.get(f.id);
      if (existingFile !== undefined) {
        reusedStatus.add(existingFile.id);
        // Update tags (might have changes, e.g. removed/merged)
        const newTags = f.tags.map((t) => this.rootStore.tagStore.get(t));
        if (Array.from(existingFile.tags).some((t, i) => t?.id !== f.tags[i])) {
          existingFile.updateTagsFromBackend(newTags as ClientTag[]);
        }
        return existingFile;
      }

      // Otherwise, create new one.
      // TODO: Maybe better performance by always keeping the same pool of client files,
      // and just replacing their properties instead of creating new objects
      // But that's micro optimization...

      const file = new ClientFile(this, f);
      // Initialize the thumbnail path so the image can be loaded immediately when it mounts.
      // To ensure the thumbnail actually exists, the `ensureThumbnail` function should be called
      file.thumbnailPath = needsThumbnail(f.width, f.height)
        ? getThumbnailPath(f.absolutePath, this.rootStore.uiStore.thumbnailDirectory)
        : f.absolutePath;
      return file;
    });

    return [clientFiles, reusedStatus];
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
  async refetchFileCounts() {
    const noTagsCriteria = new ClientTagSearchCriteria(this.rootStore.tagStore, 'tags').serialize();
    const numUntaggedFiles = await this.backend.countFiles(noTagsCriteria);
    const numTotalFiles = await this.backend.countFiles();
    runInAction(() => {
      this.numUntaggedFiles = numUntaggedFiles;
      this.numTotalFiles = numTotalFiles;
    });
  }

  @action private setFileOrder(order: FileOrder = FileOrder.Desc) {
    this.fileOrder = order;
  }

  @action private setOrderBy(prop: keyof IFile = 'dateAdded') {
    this.orderBy = prop;
  }

  @action private setContentMissing() {
    this.content = Content.Missing;
  }

  @action private incrementNumMissingFiles() {
    this.numMissingFiles++;
  }
}

export default FileStore;
