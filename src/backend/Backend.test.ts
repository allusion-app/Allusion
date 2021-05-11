// Mocks the DBRepository file with the one defined in the __mocks__ directory
jest.mock('./DBRepository');

import Backend from './Backend';
import { ITag, ROOT_TAG_ID } from '../entities/Tag';
import { IFile } from '../entities/File';
import { FileOrder } from './DBRepository';

const backend = new Backend();

const mockTag: ITag = {
  id: 'tag1',
  name: 'tag1 name',
  dateAdded: new Date(),
  color: '',
  subTags: [],
};

const mockFile: IFile = {
  absolutePath: 'c:/test file.jpg',
  relativePath: 'test file.jpg',
  locationId: 'Default location',
  name: 'test file.jpg',
  size: 42,
  width: 640,
  height: 480,
  dateAdded: new Date(),
  dateModified: new Date(),
  dateCreated: new Date(),
  extension: 'jpg',
  id: '1234',
  tags: [mockTag.id],
};

describe('Backend', () => {
  beforeAll(() => {
    return backend.init(false);
  });

  describe('Tag API', () => {
    it('should be able to fetch a tag after adding it', async () => {
      await backend.createTag({ ...mockTag });
      const dbTags = await backend.fetchTags();
      expect(dbTags).toHaveLength(2);
      expect(dbTags[0].id).toBe(ROOT_TAG_ID);
      expect(dbTags[1].id).toBe(mockTag.id);
    });

    it('should remove the tag from all files with that tag when removing that tag', async () => {
      await backend.createTag({ ...mockTag });
      await backend.createFile({ ...mockFile, id: '1' });
      await backend.createFile({ ...mockFile, id: '2' });
      await backend.removeTag(mockTag.id);
      const dbFiles = await backend.fetchFiles('id', FileOrder.Desc);
      expect(dbFiles).toHaveLength(2);
      expect(dbFiles[0].tags).toHaveLength(0);
      expect(dbFiles[1].tags).toHaveLength(0);
    });
  });
});
