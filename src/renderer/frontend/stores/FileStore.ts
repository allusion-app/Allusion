import { action, observable, computed, observe, runInAction } from 'mobx';
import fs from 'fs-extra';

import Backend from '../../backend/Backend';
import { ClientFile, IFile } from '../../entities/File';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
import { SearchCriteria, ClientArraySearchCriteria } from '../../entities/SearchCriteria';
import { getThumbnailPath, debounce, needsThumbnail, promiseAllLimit } from '../utils';
import { ClientTag } from '../../entities/Tag';
import { FileOrder } from '../../backend/DBRepository';
import { ClientLocation } from '../../entities/Location';

const FILE_STORAGE_KEY = 'Allusion_File';

/** These fields are stored and recovered when the application opens up */
const PersistentPreferenceFields: Array<keyof FileStore> = ['fileOrder', 'orderBy'];

export type ViewContent = 'query' | 'all' | 'untagged' | 'missing';

class FileStore {
  readonly fileList = observable<ClientFile>([]);

  // TODO: Also maintain a dictionary of ID -> ClientFile for quick access and getting all IDs using Object.keys

  /** The origin of the current files that are shown */
  @observable content: ViewContent = 'all';
  @observable fileOrder: FileOrder = 'DESC';
  @observable orderBy: keyof IFile = 'dateAdded';
  @observable numUntaggedFiles = 0;
  @observable numMissingFiles = 0;

  private backend: Backend;
  private rootStore: RootStore;

  constructor(backend: Backend, rootStore: RootStore) {
    this.backend = backend;
    this.rootStore = rootStore;

    // Store preferences immediately when anything is changed
    const debouncedPersist = debounce(this.storePersistentPreferences, 200).bind(this);
    PersistentPreferenceFields.forEach((f) => observe(this, f, debouncedPersist));
  }

  @computed get showsAllContent() {
    return this.content === 'all';
  }

  @computed get showsUntaggedContent() {
    return this.content === 'untagged';
  }

  @computed get showsMissingContent() {
    return this.content === 'missing';
  }

  @computed get showsQueryContent() {
    return this.content === 'query';
  }

  @action.bound switchFileOrder() {
    this.setFileOrder(this.fileOrder === 'DESC' ? 'ASC' : 'DESC');
    this.refetch();
  }

  @action.bound orderFilesBy(prop: keyof IFile = 'dateAdded') {
    this.setOrderBy(prop);
    this.refetch();
  }

  @action.bound setContentQuery() {
    this.setContent('query');
  }

  @action.bound setContentAll() {
    this.setContent('all');
  }

  @action.bound setContentUntagged() {
    this.setContent('untagged');
  }

  @action.bound async init(autoLoadFiles: boolean) {
    if (autoLoadFiles) {
      await this.loadFiles();
      this.numUntaggedFiles = await this.backend.getNumUntaggedFiles();
    }
  }

  @action.bound async addFile(path: string, locationId: ID, dateAdded: Date = new Date()) {
    const loc = this.rootStore.locationStore.get(locationId)!;
    const file = new ClientFile(this, {
      id: generateId(),
      locationId,
      absolutePath: path,
      relativePath: path.replace(loc.path, ''),
      dateAdded: dateAdded,
      dateModified: new Date(),
      tags: [],
      ...(await ClientFile.getMetaData(path)),
    });
    // The function caller is responsible for handling errors.
    await this.backend.createFile(file.serialize());
    this.add(file);
    this.incrementNumUntaggedFiles();
    return file;
  }

  /** Client-only remove: Hides a file */
  @action.bound async hideFile(file: ClientFile) {
    file.dispose();
    this.rootStore.uiStore.deselectFile(file);
    this.fileList.remove(file);
    this.incrementNumMissingFiles();
    if (file.tags.length === 0) {
      this.decrementNumUntaggedFiles();
    }
  }

  @action.bound async removeFilesById(ids: ID[], removeFromDB = true) {
    const filesToRemove = ids
      .map((id) => this.get(id))
      .filter((f) => f !== undefined) as ClientFile[];

    try {
      filesToRemove.forEach((file) => this.hideFile(file));
      if (removeFromDB) {
        await Promise.all(filesToRemove.map((f) => this.removeThumbnail(f)));
        await this.backend.removeFiles(filesToRemove);
      }
      runInAction(() =>
        filesToRemove.forEach((f) => {
          if (f.isBroken) this.numMissingFiles--;
          if (f.tags.length === 0) this.numUntaggedFiles--;
        }),
      );
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
    }
  }

  @action.bound async fetchAllFiles() {
    try {
      this.rootStore.uiStore.closeQuickSearch();
      const fetchedFiles = await this.backend.fetchFiles(this.orderBy, this.fileOrder);
      this.updateFromBackend(fetchedFiles);
      this.setContentAll();
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound async fetchUntaggedFiles() {
    try {
      const { uiStore } = this.rootStore;
      uiStore.closeQuickSearch();
      const criteria = new ClientArraySearchCriteria('tags', []).serialize();
      const fetchedFiles = await this.backend.searchFiles(
        criteria,
        this.orderBy,
        this.fileOrder,
        uiStore.searchMatchAny,
      );
      this.updateFromBackend(fetchedFiles);
      this.setContentUntagged();
    } catch (err) {
      console.error('Could not load all files', err);
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
      this.updateFromBackend(fetchedFiles);
      this.setContentQuery();
    } catch (e) {
      console.log('Could not find files based on criteria', e);
    }
  }

  @action.bound async fetchFilesByIDs(files: ID[]) {
    try {
      const fetchedFiles = await this.backend.fetchFilesByID(files);
      this.updateFromBackend(fetchedFiles);
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

  @action.bound incrementNumMissingFiles() {
    this.numMissingFiles++;
  }

  @action.bound decrementNumMissingFiles() {
    if (this.numMissingFiles === 0) {
      throw new Error('Invalid Database State: Cannot have less than 0 missing files.');
    }
    this.numMissingFiles--;
  }

  // Removes all items from fileList
  @action.bound clearFileList() {
    // Clean up observers of ClientFiles before removing them
    this.fileList.forEach((f) => f.dispose());
    this.fileList.clear();
  }

  get(id: ID): ClientFile | undefined {
    return this.fileList.find((f) => f.id === id);
  }

  getTag(tag: ID): ClientTag | undefined {
    return this.rootStore.tagStore.get(tag);
  }

  save(file: IFile) {
    file.dateModified = new Date();
    this.backend.saveFile(file);
  }

  getFileLocation(file: IFile): ClientLocation {
    const location = this.rootStore.locationStore.get(file.locationId);
    if (!location) {
      console.warn('Location of file was not found! This should never happen!', file);
      return this.rootStore.locationStore.getDefaultLocation();
    }
    return location;
  }

  recoverPersistentPreferences() {
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

  storePersistentPreferences() {
    const prefs: any = {};
    for (const field of PersistentPreferenceFields) {
      prefs[field] = this[field];
    }
    localStorage.setItem(FILE_STORAGE_KEY, JSON.stringify(prefs));
  }

  @action.bound private async loadFiles() {
    const fetchedFiles = await this.backend.fetchFiles(this.orderBy, this.fileOrder);
    await this.updateFromBackend(fetchedFiles);
  }

  @action.bound private async updateFromBackend(backendFiles: IFile[]) {
    const locationIds = this.rootStore.locationStore.locationList.map((l) => l.id);

    // For every new file coming in, either re-use the existing client file if it exists,
    // or construct a new client file
    const [newClientFiles, reusedStatus] = this.filesFromBackend(backendFiles);

    // Check existence of new files asynchronously, no need to wait until they can be showed
    // we can simply check whether they exist after they start rendering
    const existenceCheckPromises = newClientFiles.map((clientFile) => async () => {
      let isMissing = clientFile.isBroken;
      if (clientFile.isBroken === undefined) {
        try {
          await fs.access(clientFile.absolutePath, fs.constants.F_OK);
          clientFile.setBroken(false);
          isMissing = false;
        } catch (err) {
          clientFile.setBroken(true);
          isMissing = true;

          // Old approach: keeping it commented out for now
          // Remove file from client only - keep in DB in case it will be recovered later
          // TODO: Store missing date so it can be automatically removed after some time?
          // if (clientFile) {
          //   clientFile.dispose();
          //   this.fileList.remove(clientFile);
          // }
        }
      }

      // TODO: DEBUG CHECK. Remove this when going out for release version
      // Check if file belongs to a location; shouldn't be needed, but useful for during development
      if (!locationIds.includes(clientFile.locationId)) {
        console.warn(
          'DEBUG: Found a file that does not belong to any location! Will still show up. SHOULD NEVER HAPPEN',
          clientFile,
        );
      }
      return isMissing;
    });

    // Run the existence check with at most N checks in parallel
    // TODO: Should make N configurage, or determine based on the system/disk performance
    const N = 50;
    promiseAllLimit(existenceCheckPromises, N)
      .then((existenceCheck) => {
        console.log('Processed existence checker!');
        // Update missing file counter
        runInAction(
          () => (this.numMissingFiles = existenceCheck.filter((val) => val === true).length),
        );
      })
      .catch((e) => console.error('An error occured during existance checkiong!', e));

    // Re-count the number of untagged files
    // TODO: This shouldn't be recounted every time files are fetched - it should be the overall total, not of just those currently shown
    // let numUntaggedFiles = 0;
    // for (const f of backendFiles) {
    //   if (f.tags.length === 0) {
    //     numUntaggedFiles++;
    //   }
    // }
    // runInAction(() => (this.numUntaggedFiles = numUntaggedFiles));

    if (backendFiles.length === 0) {
      return this.clearFileList();
    }

    // Dispose of Client files that are not re-used
    for (const file of this.fileList) {
      if (!reusedStatus.has(file.id)) {
        file.dispose();
      }
    }
    return this.replaceFileList(newClientFiles);
  }

  @action.bound async fetchMissingFiles() {
    try {
      const {
        orderBy,
        fileOrder,
        rootStore: { uiStore },
      } = this;

      uiStore.closeQuickSearch();
      this.setContent('missing');

      // Fetch all files, then check their existence and only show the missing ones
      // Similar to {@link updateFromBackend}, but the existence check needs to be awaited before we can show the images
      const backendFiles = await this.backend.fetchFiles(orderBy, fileOrder);

      // For every new file coming in, either re-use the existing client file if it exists,
      // or construct a new client file
      const [newClientFiles, reusedStatus] = this.filesFromBackend(backendFiles);

      // We don't store whether files are missing (since they might change at any time)
      // So we have to check all files and check their existence them here
      const existenceCheckPromises = newClientFiles.map((clientFile) => async () => {
        try {
          await fs.access(clientFile.absolutePath, fs.constants.F_OK);
          clientFile.setBroken(false);
          return false;
        } catch (err) {
          clientFile.setBroken(true);
          return true;
        }
      });

      const N = 50; // TODO: same here as in fetchFromBackend: number of concurrent checks should be system dependent
      const existenceCheck = await promiseAllLimit(existenceCheckPromises, N);
      const missingClientFiles = newClientFiles.filter((_, i) => existenceCheck[i]);

      runInAction(() => (this.numMissingFiles = missingClientFiles.length));

      // Dispose of unused files
      for (const oldFile of this.fileList) {
        if (
          !reusedStatus.has(oldFile.id) ||
          !missingClientFiles.find((newFile) => newFile.id === oldFile.id)
        ) {
          oldFile.dispose();
        }
      }

      this.replaceFileList(missingClientFiles);
    } catch (err) {
      console.error('Could not load broken files', err);
    }
  }

  @action.bound private add(file: ClientFile) {
    this.fileList.push(file);
  }

  @action.bound private addFiles(files: ClientFile[]) {
    this.fileList.push(...files);
  }

  /**
   *
   * @param backendFiles
   * @returns A list of Client files, and a set of keys that was reused from the existing fileList
   */
  @action.bound private filesFromBackend(backendFiles: IFile[]): [ClientFile[], Set<ID>] {
    const reusedStatus = new Set<ID>();
    const clientFiles = backendFiles.map((file) => {
      // Might already exist!
      const existingFile = this.get(file.id);
      if (existingFile) {
        reusedStatus.add(file.id);
        return existingFile;
      }

      // Otherwise, create new one.
      // TODO: Maybe better performance by always keeping the same pool of client files,
      // and just replacing their properties instead of creating new objects
      // But that's micro optimization...

      const f = new ClientFile(this, file);
      // Initialize the thumbnail path so the image can be loaded immediately when it mounts.
      // To ensure the thumbnail actually exists, the `ensureThumbnail` function should be called
      f.thumbnailPath = needsThumbnail(file.width, file.height)
        ? getThumbnailPath(file.absolutePath, this.rootStore.uiStore.thumbnailDirectory)
        : file.absolutePath;
      return f;
    });
    return [clientFiles, reusedStatus];
  }

  @action.bound private async removeThumbnail(file: ClientFile) {
    const thumbDir = getThumbnailPath(file.absolutePath, this.rootStore.uiStore.thumbnailDirectory);
    if (await fs.pathExists(thumbDir)) {
      await fs.remove(thumbDir);
    }
  }

  @action.bound private replaceFileList(backendFiles: ClientFile[]) {
    this.fileList.forEach((f) => f.dispose());
    this.fileList.replace(backendFiles);
  }

  @action private setFileOrder(order: FileOrder = 'DESC') {
    this.fileOrder = order;
  }

  @action private setOrderBy(prop: keyof IFile = 'dateAdded') {
    this.orderBy = prop;
  }

  @action private setContent(content: ViewContent = 'all') {
    this.content = content;
  }
}

export default FileStore;
