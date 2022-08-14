import fse from 'fs-extra';
import { getExtension, IFile } from 'src/entities/File';
import { ID } from 'src/entities/ID';
import { ILocation } from 'src/entities/Location';
import path from 'path';

/**
 * Stores Allusion's metadata of an image file.
 * Only storing Allusion's data here that cannot be reconstructed from the file itself.
 * Exception: Width and height, to decrease the time needed to parse the file metadata
 */
interface SerializedFile {
  /* E.g. "MyFolder/test.jpg" */
  relativePath: string;
  tags: ID[];
  width: number;
  height: number;
  dateAdded: string;
  dateModified: string;
}

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
 *
 * Experiment 2:
 * - A hidden folder at the root of a Location, containing a sidecar file for every file in the location: [id].json
 *    - Alternative: Store the sidecar file in the same folder as the image file
 *
 */
class Synchronizer {
  protected serializeFile(file: IFile): SerializedFile {
    return {
      relativePath: file.relativePath.replaceAll('\\', '/'),
      tags: file.tags,
      width: file.width,
      height: file.height,
      dateAdded: file.dateAdded.toJSON(),
      dateModified: file.dateModified.toJSON(),
    };
  }

  protected async deserializeFile(
    id: string,
    location: ILocation,
    data: SerializedFile,
  ): Promise<IFile> {
    const absolutePath = path.join(location.path, data.relativePath);
    // might be nicer to pass this in this function: the file might not exist on disk (yet), would be better to handle that case elsewhere
    const stats = await fse.stat(absolutePath);

    return {
      id,
      name: path.basename(data.relativePath),
      extension: getExtension(data.relativePath),
      ino: stats.ino.toString(),
      tags: data.tags,
      locationId: location.id,
      dateLastIndexed: new Date(),
      dateAdded: new Date(data.dateAdded),
      dateModified: new Date(data.dateModified),
      dateCreated: stats.ctime,
      absolutePath,
      relativePath: data.relativePath,
      width: data.width,
      height: data.height,
      size: stats.size,
    };
  }

  async upsert(location: ILocation, file: IFile): Promise<void> {
    const metadataFilePath = path.join(location.path, '.Allusion', `${file.id}.json`);
    return fse.writeJSON(metadataFilePath, this.serializeFile(file));
  }
}

export default Synchronizer;
