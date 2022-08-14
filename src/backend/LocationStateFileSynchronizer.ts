import chokidar from 'chokidar';
import fse from 'fs-extra';
import os from 'os';
import SysPath from 'path';
import { getExtension, IFile } from 'src/entities/File';
import { ID } from 'src/entities/ID';
import { ClientLocation } from 'src/entities/Location';
import { ITag } from 'src/entities/Tag';
import DBRepository from './DBRepository';

type LocationStateFile = {
  /** An identifier who created this file. Used for only processing state file changes made on other machines */
  modifiedBy: string;
  dateCreated: number;
  dateModified: number;
  tags: { id: ID; name: string; dateModified: number; parentId: ID }[];
  files: { id: ID; relativePath: string; tags: ID[]; dateModified: number }[];
};

const STATE_FILE_NAME = 'Allusion.json';

/**
 * Network-drive/cloud-storage synchronization of Allusion's database,
 * by writing/reading metadata file(s)
 *
 * Questions:
 * - Where will be the "truth" of the data?
 *   - Currently, Allusion's DB is the truth
 *   - If we start storing data on disk, will that be the "truth"
 *     that needs to be kept in sync with the DB at all times?
 *
 * Experiment 1:
 * - Allusion is based on Locations, not any arbitrary files
 * - A single file at the root of a Location, containing
 *   - All tags and their properties
 *     This is duplicated when you're using multiple Location folders
 *     Could also filter out tags not used by the Location
 *     - Hmm, when sharing with other people, you don't want your and their tag structure to be combined
 *     - Would be best to support the concept of "workspaces" then
 *   - All files of that location, including their tags
 * - How to deal with conflicts:
 *   - Network drive: Not sure
 *   - Cloud storage
 *      - Dropbox creates a copy of the file, renamed with "COPY" and who modified it
 *      - Google Drive asks you whether you want to create a copy (?)
 */
class LocationStateFileSynchronizer {
  stateFilePath: string;

  constructor(
    private location: ClientLocation,
    private fileRepository: DBRepository<IFile>,
    private tagRepository: DBRepository<ITag>,
  ) {
    this.stateFilePath = SysPath.join(location.path, STATE_FILE_NAME);
  }

  getSystemIdentifier(): string {
    const userInfo = os.userInfo();
    console.log(userInfo);
    return `${userInfo.username}-${userInfo.gid}-${userInfo.uid}`;
  }

  async init(): Promise<void> {
    const stateFileWatcher = chokidar.watch(this.stateFilePath, {
      persistent: true,
    });
    stateFileWatcher
      .on('add', () => {
        console.log('ADDED');
      })
      .on('change', () => {
        console.log('CHANGED');
        // TODO: check if changed by other instance on shared disk
      });

    try {
      // After the location is intialized from the state in the DB:
      // Check if there is a state file and if it was changed since the the last sync to the DB state
      const stateOnDisk = await fse.readJSON(this.stateFilePath);

      console.log(stateOnDisk);
    } catch (e) {}
  }

  /**
   * Read the current state file on disk and synchronize it with the database.
   * Writes new state file if changed were made to the location's state through the sync
   * @param data
   */
  async synchronizeWithStateFile(data: LocationStateFile): Promise<void> {
    type StateTag = LocationStateFile['tags'][0];
    type StateFile = LocationStateFile['files'][0];

    if (data.modifiedBy === this.getSystemIdentifier()) {
      console.debug(
        `Location ${this.location.name} was attempted to be synced, but the current state was created by this system`,
      );
      // TODO: could still overwrite the file with the current state
      return;
    }

    if (this.location.dateStateSynchronized) {
      if (this.location.dateStateSynchronized.getTime() > data.dateModified) {
        console.debug('DB state is more recent than state file');
      }
    }

    // first sync the tags: add any new tags in state file to the DB representation
    const dbTags = await this.tagRepository.getAll({});
    const dbTagMap = new Map<ID, ITag>();
    dbTags.forEach((tag) => dbTagMap.set(tag.id, tag));

    const updateTag = (dbTag: ITag, stateTag: StateTag) => {
      dbTag.name = stateTag.name;
      // dbTag.color = stateTag.color;
      // dbTag.isHidden = stateTag.isHidden;
      dbTag.dateModified = new Date();
      // TODO: blegh, why do we have subTags instead of a parentTag per tag?
      // hard to track which was last modified now
      // and it could cause tags to have multiple parent tags if we're not careful
      // TODO: figure out parent/child syncing
    };

    const tagsToInsert: StateTag[] = [];
    // - for all tags in state file
    for (const stateTag of data.tags) {
      const dbTag = dbTagMap.get(stateTag.id);
      //   - if present in db, update if it's more recent
      //   - if not present in db, mark as needs-insertion
      if (dbTag) {
        if (stateTag.dateModified > dbTag.dateModified.getTime()) {
          updateTag(dbTag, stateTag);
        }
      } else {
        tagsToInsert.push(stateTag);
      }
    }

    // - for all tags with needs-insertion:
    //   - find the highest parent-tag that is still in the db
    //   - if there is a match: insert it and its child-tags
    //   - else, add as child to the root tag
    // TODO: idea: include all root-sub-trees if any tags are used
    await this.tagRepository.createMany(
      tagsToInsert.map((t) => ({
        id: t.id,
        name: t.name,
        dateAdded: new Date(),
        dateModified: new Date(),
        color: '',
        // subTags: [], // TODO: figure this out
        parentId: '',
        isHidden: false,
      })),
    );

    const dbFiles = await this.getDatabaseFiles();
    const dbFileMap = new Map<ID, IFile>();
    dbFiles.forEach((file) => dbFileMap.set(file.id, file));

    // For all files on disk, compare to internal DB and update if needed
    //  - for deleted files on disk or on db: keep them in DB for now, maybe the files haven't been fully synced yet. User can delete those manually if need be
    const filesToInsert: StateFile[] = [];
    for (const stateFile of data.files) {
      const dbFile = dbFileMap.get(stateFile.id);
      if (dbFile) {
        if (stateFile.dateModified > dbFile.dateModified.getTime()) {
          dbFile.tags = stateFile.tags; // todo: merge or replace? replacing for now
          dbFile.dateModified = new Date();
          // TODO: update path in case it was moved?
        }
      } else {
        filesToInsert.push(stateFile);
      }
    }
    this.fileRepository.createMany(
      filesToInsert.map((f) => ({
        id: f.id,
        dateCreated: new Date(),
        dateAdded: new Date(),
        dateModified: new Date(),
        dateLastIndexed: new Date(0),
        width: 0,
        height: 0,
        ino: '',
        absolutePath: SysPath.join(this.location.path, f.relativePath),
        relativePath: f.relativePath,
        locationId: this.location.id,
        name: SysPath.basename(f.relativePath),
        extension: getExtension(f.relativePath),
        size: 0,
        tags: f.tags, // todo: check if they still exist?
        // TODO: if file exists, look up proper properties
        // the file may not exist yet, e.g. on dropbox the state file could have been downloaded before all images
      })),
    );

    // export: identify tags used in location
  }

  private async getDatabaseFiles() {
    return this.fileRepository.find({
      criteria: {
        valueType: 'string',
        key: 'locationId',
        operator: 'equals',
        value: this.location.id,
      },
    });
  }

  async writeStateFile(): Promise<void> {
    const files = await this.getDatabaseFiles();
    // TODO: also include parent tags
    const tagsIDsOnFiles = Array.from(new Set(...files.flatMap((f) => f.tags)));

    const modifiedBy = this.getSystemIdentifier();

    const data: LocationStateFile = {
      modifiedBy,
      dateCreated: new Date().getTime(),
      dateModified: new Date().getTime(),
      tags: tagsIDsOnFiles.map((id) => ({ id, name: 'unknown', dateModified: 0, parentId: '' })),
      files: files
        // TODO: Filtering out files without tags to reduce unnecessary sync
        // .filter((f) => f.tags.length > 0)
        .map((f) => ({
          id: f.id,
          tags: f.tags,
          relativePath: f.relativePath.replaceAll('\\', '/'),
          dateModified: f.dateModified.getTime(),
        })),
    };

    await fse.writeJSON(this.stateFilePath, data);
  }
}

export default LocationStateFileSynchronizer;
