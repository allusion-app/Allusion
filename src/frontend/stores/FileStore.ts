import fse from 'fs-extra';
import { action, computed, makeObservable, observable, runInAction } from 'mobx';
import Backend from 'src/backend/Backend';
import { ClientFile, mergeMovedFile } from 'src/entities/File';
import { ID } from 'src/api/ID';
import { ClientLocation } from 'src/entities/Location';
import { ClientFileSearchCriteria } from 'src/entities/SearchCriteria';
import { FileDTO, IMG_EXTENSIONS_TYPE } from 'src/api/FileDTO';
import {
  FileOrder,
  FileSearchCriteriaDTO,
  OrderDirection,
  SearchableFileData,
} from 'src/api/FileSearchDTO';
import { SearchCriteriaDTO } from 'src/api/SearchCriteriaDTO';
import { ClientTag } from 'src/entities/Tag';
import { AppToaster } from '../components/Toaster';
import { debounce } from 'common/timeout';
import { getThumbnailPath } from 'common/fs';
import { promiseAllLimit } from 'common/promise';
import RootStore from './RootStore';
import { IndexMap } from '../data/IndexMap';

const enum Content {
  All,
  Missing,
  Untagged,
  Query,
}

class FileStore {
  private readonly backend: Backend;
  private readonly rootStore: RootStore;

  public readonly fileIndex = new IndexMap<ID, ClientFile>();
  /**
   * The timestamp when the fileList was last modified.
   * Useful for in react component dependencies that need to trigger logic when the fileList changes
   */
  public fileListLastModified = observable<Date>(new Date());

  private filesToSave: Map<ID, FileDTO> = new Map();

  /** The origin of the current files that are shown */
  @observable private content: Content = Content.All;
  @observable orderDirection: OrderDirection;
  @observable orderBy: FileOrder;
  @observable numTotalFiles = 0;
  @observable numUntaggedFiles = 0;
  @observable numMissingFiles = 0;

  debouncedRefetch: () => void;
  debouncedSaveFilesToSave: () => Promise<void>;

  constructor(
    backend: Backend,
    rootStore: RootStore,
    orderDirection: OrderDirection,
    orderBy: FileOrder,
  ) {
    this.backend = backend;
    this.rootStore = rootStore;

    this.orderDirection = orderDirection;
    this.orderBy = orderBy;

    makeObservable(this);

    this.debouncedRefetch = debounce(this.refetch, 200).bind(this);
    this.debouncedSaveFilesToSave = debounce(this.saveFilesToSave, 100).bind(this);
  }

  public get fileList(): readonly ClientFile[] {
    return this.fileIndex.values();
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
    const numFiles = this.fileList.length;
    const tagFilePairs = this.fileList.map((f) => ({
      absolutePath: f.absolutePath,
      tagHierarchy: Array.from(f.tags, (t) => t.path),
    }));

    try {
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

  @action.bound
  public switchOrderDirection() {
    this.orderDirection =
      this.orderDirection === OrderDirection.Desc ? OrderDirection.Asc : OrderDirection.Desc;
    this.refetch();
  }

  @action.bound
  public orderFilesBy(prop: FileOrder = 'dateAdded') {
    this.orderBy = prop;
    this.refetch();
  }

  @action.bound setContentQuery() {
    this.content = Content.Query;
    if (this.rootStore.uiStore.isSlideMode) {
      this.rootStore.uiStore.disableSlideMode();
    }
  }

  @action.bound setContentAll() {
    this.content = Content.All;
    if (this.rootStore.uiStore.isSlideMode) {
      this.rootStore.uiStore.disableSlideMode();
    }
  }

  @action.bound setContentUntagged() {
    this.content = Content.Untagged;
    if (this.rootStore.uiStore.isSlideMode) {
      this.rootStore.uiStore.disableSlideMode();
    }
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
    this.rootStore.uiStore.fileSelection.deselect(file);
    this.incrementNumMissingFiles();
    if (file.tags.size === 0) {
      this.decrementNumUntaggedFiles();
    }
  }

  /** Replaces a file's data when it is moved or renamed */
  @action.bound
  public replaceMovedFile(file: ClientFile, newData: FileDTO): void {
    if (this.fileIndex.has(file.id)) {
      file.dispose();

      const newFileDTO = mergeMovedFile(file.serialize(), newData);

      // Move thumbnail
      const { thumbnailDirectory } = this.rootStore.uiStore; // TODO: make a config store for this?
      const oldThumbnailPath = file.thumbnailPath.replace('?v=1', '');
      const newThumbPath = getThumbnailPath(newData.absolutePath, thumbnailDirectory);
      // eslint-disable-next-line @typescript-eslint/no-empty-function
      fse.move(oldThumbnailPath, newThumbPath).catch(() => {});

      const newClientFile = new ClientFile(this, newFileDTO);
      newClientFile.thumbnailPath = newThumbPath;
      this.fileIndex.insert(file.id, newClientFile);
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
        this.rootStore.uiStore.fileSelection.deselect(file);
        this.removeThumbnail(file.absolutePath);
      }
      return this.refetch();
    } catch (err) {
      console.error('Could not remove files', err);
    }
  }

  @action async deleteFilesByExtension(ext: IMG_EXTENSIONS_TYPE): Promise<void> {
    try {
      const crit: SearchCriteriaDTO<FileDTO, ID> = {
        key: 'extension',
        operator: 'equals',
        value: ext,
        valueType: 'string',
      };
      const files = await this.backend.searchFiles([crit], 'id', OrderDirection.Asc);
      console.log('Files to delete', ext, files);
      await this.backend.removeFiles(files.map((f) => f.id));

      for (const file of files) {
        this.removeThumbnail(file.absolutePath);
      }
    } catch (e) {
      console.error('Could not delete files bye extension', ext);
    }
  }

  @action.bound async refetch() {
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

  @action.bound
  public async fetchAllFiles(): Promise<void> {
    try {
      this.rootStore.uiStore.clearSearchCriteriaList();
      const fetchedFiles = await this.backend.fetchFiles(this.orderBy, this.orderDirection);
      this.setContentAll();
      this.updateFromBackend(fetchedFiles);
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound
  public async fetchUntaggedFiles(): Promise<void> {
    try {
      const { uiStore } = this.rootStore;
      uiStore.clearSearchCriteriaList();
      const criteria = ClientFileSearchCriteria.tags('contains', []);
      uiStore.searchCriteriaList.push(criteria);
      const fetchedFiles = await this.backend.searchFiles(
        toSearchCriteriaDTOs(this.rootStore, [criteria]),
        this.orderBy,
        this.orderDirection,
        uiStore.searchMatchAny,
      );
      this.setContentUntagged();
      this.updateFromBackend(fetchedFiles);
    } catch (err) {
      console.error('Could not load all files', err);
    }
  }

  @action.bound
  public async fetchMissingFiles(): Promise<void> {
    const {
      orderBy,
      orderDirection,
      rootStore: { uiStore },
    } = this;

    uiStore.searchCriteriaList.clear();
    this.content = Content.Missing;

    try {
      // Fetch all files, then check their existence and only show the missing ones
      // Similar to {@link updateFromBackend}, but the existence check needs to be awaited before we can show the images
      const backendFiles = await this.backend.fetchFiles(orderBy, orderDirection);

      // For every new file coming in, either re-use the existing client file if it exists,
      // or construct a new client file
      this.mergeFilesFromBackend(backendFiles);

      const newClientFiles = this.fileIndex.slice();

      // We don't store whether files are missing (since they might change at any time)
      // So we have to check all files and check their existence them here
      const existenceCheckPromises = newClientFiles.map((clientFile) => async () => {
        clientFile.setBroken(!(await fse.pathExists(clientFile.absolutePath)));
      });

      const N = 50; // TODO: same here as in fetchFromBackend: number of concurrent checks should be system dependent
      await promiseAllLimit(existenceCheckPromises, N);

      runInAction(() => {
        this.fileIndex.retain((file) => file.isBroken === true);
        this.numMissingFiles = this.fileList.length;
        this.fileListLastModified = new Date();
        this.cleanFileSelection();
      });

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

  @action.bound
  public async fetchFilesByQuery(): Promise<void> {
    const { uiStore } = this.rootStore;
    if (this.rootStore.uiStore.searchCriteriaList.length === 0) {
      return this.fetchAllFiles();
    }

    const criteria = toSearchCriteriaDTOs(
      this.rootStore,
      this.rootStore.uiStore.searchCriteriaList as any,
    );

    try {
      const fetchedFiles = await this.backend.searchFiles(
        criteria,
        this.orderBy,
        this.orderDirection,
        uiStore.searchMatchAny,
      );
      this.setContentQuery();
      this.updateFromBackend(fetchedFiles);
    } catch (e) {
      console.log('Could not find files based on criteria', e);
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

  public getIndex(id: ID): number | undefined {
    return this.fileIndex.getIndex(id);
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
    await this.backend.saveFiles(Array.from(this.filesToSave.values()));
    this.filesToSave.clear();
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

  @action
  public updateFromBackend(backendFiles: FileDTO[]): void {
    if (backendFiles.length === 0) {
      this.fileIndex.clear();
      this.rootStore.uiStore.fileSelection.clear();
      this.fileListLastModified = new Date();
      return;
    }

    // Filter out images with hidden tags
    // TODO: could also do it in search query, this is simpler though (maybe also more performant)
    const hiddenTagIds = new Set(
      this.rootStore.tagStore.tagList.filter((t) => t.isHidden).map((t) => t.id),
    );
    backendFiles = backendFiles.filter((f) => !f.tags.some((t) => hiddenTagIds.has(t)));

    // For every new file coming in, either re-use the existing client file if it exists,
    // or construct a new client file
    this.mergeFilesFromBackend(backendFiles);

    this.cleanFileSelection();
    this.fileListLastModified = new Date();

    // Check existence of new files asynchronously, no need to wait until they can be shown
    // we can simply check whether they exist after they start rendering
    // TODO: We can already get this from chokidar (folder watching), pretty much for free
    // TODO: How to deal with missing files?
    const existenceCheckPromises = this.fileList.map((clientFile) => async () => {
      clientFile.setBroken(!(await fse.pathExists(clientFile.absolutePath)));
    });

    // Run the existence check with at most N checks in parallel
    // TODO: Should make N configurable, or determine based on the system/disk performance
    // NOTE: This is _not_ await intentionally, since we want to show the files to the user as soon as possible
    const N = 50;
    promiseAllLimit(existenceCheckPromises, N).catch((e) =>
      console.error('An error occured during existence checking!', e),
    );
  }

  /** Remove files from selection that are not in the file list anymore */
  private cleanFileSelection(): void {
    const { fileSelection } = this.rootStore.uiStore;
    for (const file of fileSelection) {
      if (!this.fileIndex.has(file.id)) {
        fileSelection.deselect(file);
      }
    }
  }

  /**
   * Merges client files with the backend files.
   *
   * If a client file exists with a corresponding backend file id, it will be updated with the backend file data.
   * Otherwise, a new client file be created. Every client file with a non-matching backend file will be removed.
   * @param backendFiles The query results from the backend.
   * @returns A list of client files that were not reused from the existing fileList.
   */
  @action
  private mergeFilesFromBackend(backendFiles: FileDTO[]): void {
    const disposedFiles = this.fileIndex.insertSort(
      backendFiles.map((backendFile) => [
        backendFile.id,
        (existingFile) => {
          // Might already exist!
          if (existingFile !== undefined) {
            // Update tags (might have changes, e.g. removed/merged)
            const newTags = backendFile.tags
              .map((tag) => this.rootStore.tagStore.get(tag))
              .filter((tag) => tag !== undefined) as ClientTag[];
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
              ? getThumbnailPath(
                  backendFile.absolutePath,
                  this.rootStore.uiStore.thumbnailDirectory,
                )
              : backendFile.absolutePath;
            return file;
          }
        },
      ]),
    );

    // Dispose of Client files that are not re-used (to get rid of MobX observers)
    if (disposedFiles !== undefined) {
      for (const file of disposedFiles) {
        file.dispose();
      }
    }
  }

  /** Initializes the total and untagged file counters by querying the database with count operations */
  @action
  public async refetchFileCounts() {
    const [numTotalFiles, numUntaggedFiles] = await this.backend.countFiles();
    runInAction(() => {
      this.numUntaggedFiles = numUntaggedFiles;
      this.numTotalFiles = numTotalFiles;
    });
  }

  // FIXME: Right now the counter is not properly updated.
  @action private decrementNumMissingFiles() {
    this.numMissingFiles--;
  }

  @action private incrementNumMissingFiles() {
    this.numMissingFiles++;
  }
}

export default FileStore;

type SearchCriteriaDTOs = [
  SearchCriteriaDTO<SearchableFileData, ID>,
  ...SearchCriteriaDTO<SearchableFileData, ID>[]
];

function toSearchCriteriaDTOs(
  rootStore: RootStore,
  criterias: [FileSearchCriteriaDTO, ...FileSearchCriteriaDTO[]],
): SearchCriteriaDTOs {
  const dbFIleSearchCriterias: SearchCriteriaDTO<SearchableFileData, ID>[] = criterias.map<
    SearchCriteriaDTO<SearchableFileData, ID>
  >((criteria) => {
    const { key, operator, value } = criteria;

    switch (key) {
      case 'tags': {
        let op = operator;
        let val = value.slice();

        if (value.length !== 0) {
          const tag = rootStore.tagStore.get(value[0]);
          if (tag !== undefined) {
            val = Array.from(tag.getSubTree(), (tag) => tag.id);
          }
        }

        if (operator === 'containsNotRecursively') {
          op = 'notContains';
        } else if (op === 'containsRecursively') {
          op = 'contains';
        }

        return { key, operator: op, value: val, valueType: 'array' };
      }

      case 'extension':
      case 'absolutePath':
      case 'name':
        return { key, operator, value, valueType: 'string' };

      case 'size':
        return { key, operator, value, valueType: 'number' };

      case 'dateAdded':
        return { key, operator, value, valueType: 'date' };

      default:
        const _exhaustiveCheck: never = criteria;
        return _exhaustiveCheck;
    }
  });

  return dbFIleSearchCriterias as SearchCriteriaDTOs;
}
