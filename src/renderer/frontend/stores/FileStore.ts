import { action, observable, computed, observe } from 'mobx';
import fs from 'fs-extra';

import Backend from '../../backend/Backend';
import { ClientFile, IFile } from '../../entities/File';
import RootStore from './RootStore';
import { ID, generateId } from '../../entities/ID';
import { SearchCriteria } from '../../entities/SearchCriteria';
import { getThumbnailPath, debounce } from '../utils';
import { ClientTag } from '../../entities/Tag';
import { FileOrder } from '../../backend/DBRepository';

const FILE_STORAGE_KEY = 'Allusion_File';

/** These fields are stored and recovered when the application opens up */
const PersistentPreferenceFields: Array<keyof FileStore> = ['content', 'fileOrder', 'orderBy'];

export type ViewContent = 'query' | 'all' | 'untagged';

class FileStore {
  readonly fileList = observable<ClientFile>([]);

  /** The origin of the current files that are shown */
  @observable content: ViewContent = 'all';
  @observable fileOrder: FileOrder = 'DESC';
  @observable orderBy: keyof IFile = 'dateAdded';
  @observable numUntaggedFiles = 0;

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

  @action.bound async addFile(filePath: string, locationId: ID, dateAdded?: Date) {
    const fileData: IFile = {
      id: generateId(),
      locationId,
      path: filePath,
      dateAdded: dateAdded ? new Date(dateAdded) : new Date(),
      dateModified: new Date(),
      tags: [],
      ...(await ClientFile.getMetaData(filePath)),
    };
    const file = new ClientFile(this, fileData);
    // The function caller is responsible for handling errors.
    await this.backend.createFile(fileData);
    this.add(file);
    this.incrementNumUntaggedFiles();
    return file;
  }

  /** Client-only remove: Hides a file */
  @action.bound async hideFile(file: ClientFile) {
    file.dispose();
    this.rootStore.uiStore.deselectFile(file);
    this.fileList.remove(file);
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
      const fetchedFiles = await this.backend.fetchFiles(this.orderBy, this.fileOrder);
      this.updateFromBackend(fetchedFiles);
      this.setContentAll();
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound async fetchUntaggedFiles() {
    try {
      const criteria: SearchCriteria<IFile> = {
        key: 'tags',
        value: [],
        operator: 'contains',
        valueType: 'array',
      };
      const fetchedFiles = await this.backend.searchFiles(criteria, this.orderBy, this.fileOrder);
      this.updateFromBackend(fetchedFiles);
      this.setContentUntagged();
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound
  async fetchFilesByQuery() {
    const criteria = this.rootStore.uiStore.searchCriteriaList.slice();
    if (criteria.length === 0) {
      return this.fetchAllFiles();
    }
    try {
      const fetchedFiles = await this.backend.searchFiles(
        criteria as [SearchCriteria<IFile>],
        this.orderBy,
        this.fileOrder,
      );
      this.updateFromBackend(fetchedFiles);
      this.setContentQuery();
    } catch (e) {
      console.log('Could not find files based on criteria', e);
    }
  }

  @action.bound async fetchFilesByTagIDs(tags: ID[]) {
    // Query the backend to send back only files with these tags
    try {
      const criteria: SearchCriteria<IFile> = {
        key: 'tags',
        value: tags,
        operator: 'contains',
        valueType: 'array',
      };
      const fetchedFiles = await this.backend.searchFiles(criteria, this.orderBy, this.fileOrder);
      this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on tag search', e);
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

  recoverPersistentPreferences() {
    const prefsString = localStorage.getItem(FILE_STORAGE_KEY);
    if (prefsString) {
      try {
        const prefs = JSON.parse(prefsString);
        this.setContent(prefs.content);
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
    // removing manually invalid files
    // watching files would be better to remove invalid files
    // files could also have moved, removing them may be undesired then

    // Todo: instead of removing invalid files, add them to an MissingFiles list and prompt to the user?
    // (maybe fetch all files, not only the ones passed given as arguments here)

    const locationIds = this.rootStore.locationStore.locationList.map((l) => l.id);
    const existenceChecker = await Promise.all(
      backendFiles.map(async (backendFile) => {
        try {
          await fs.access(backendFile.path, fs.constants.F_OK);
        } catch (err) {
          // Remove file from client only - keep in DB in case it will be recovered later
          // TODO: Store missing date so it can be automatically removed after some time?
          const clientFile = this.get(backendFile.id);
          if (clientFile) {
            if (clientFile.tags.length === 0) {
              this.decrementNumUntaggedFiles();
            }
            clientFile.dispose();
            this.fileList.remove(clientFile);
          }
          return false;
        }

        // Check if file belongs to a location; shouldn't be needed, but useful for during development
        if (!locationIds.includes(backendFile.locationId)) {
          console.warn('Found a file that does not belong to any location! Will still show up', backendFile);
          return false;
        }
        return true;
      }),
    );

    const existingBackendFiles = backendFiles.filter((_, i) => existenceChecker[i]);

    if (this.fileList.length === 0) {
      this.addFiles(this.filesFromBackend(existingBackendFiles));
      return;
    }

    if (existingBackendFiles.length === 0) {
      return this.clearFileList();
    }

    return this.replaceFileList(this.filesFromBackend(existingBackendFiles));
  }

  @action.bound async fetchBrokenFiles() {
    try {
      const { orderBy, fileOrder } = this;
      const backendFiles = await this.backend.fetchFiles(orderBy, fileOrder);

      const brokenFiles = await Promise.all(
        backendFiles.filter(async (backendFile) => {
          try {
            await fs.access(backendFile.path, fs.constants.F_OK);
            return false;
          } catch (err) {
            return true;
          }
        }),
      );
      const clientFiles = brokenFiles.map((f) => new ClientFile(this, f, true));
      clientFiles.forEach((f) => f.setThumbnailPath(
        getThumbnailPath(f.path, this.rootStore.uiStore.thumbnailDirectory)));
      this.replaceFileList(clientFiles);
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

  @action.bound private filesFromBackend(backendFiles: IFile[]): ClientFile[] {
    return backendFiles.map((file) => new ClientFile(this, file));
  }

  @action.bound private async removeThumbnail(file: ClientFile) {
    const thumbDir = getThumbnailPath(file.path, this.rootStore.uiStore.thumbnailDirectory);
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
