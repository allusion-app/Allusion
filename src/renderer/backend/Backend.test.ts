// Mocks the DBRepository file with the one defined in the __mocks__ directory
jest.mock('./DBRepository');

import Backend from './Backend';
import { ITag } from '../entities/Tag';
import { IFile } from '../entities/File';

const backend = new Backend();

const mockTag: ITag = {
  id: 'tag1',
  name: 'tag1 name',
  dateAdded: new Date(),
  description: 'tag1 description',
  color: '',
};

const mockFile: IFile = {
  path: 'c:/test file.jpg',
  name: 'test file.jpg',
  dateAdded: new Date(),
  size: 42,
  extension: 'jpg',
  id: '1234',
  tags: [mockTag.id],
};

describe('Backend', () => {
  beforeAll(() => {
    return backend.init();
  });

  describe('Tag API', () => {
    it('should be able to fetch a tag after adding it', async () => {
      await backend.createTag(mockTag.id, mockTag.name, mockTag.description);
      const dbTags = await backend.fetchTags();
      expect(dbTags).toHaveLength(1);
      expect(dbTags[0].id).toBe(mockTag.id);
    });

    it('should remove the tag from all files with that tag when removing that tag', async () => {
      await backend.createTag(mockTag.id, mockTag.name, mockTag.description);
      await backend.createFile({ ...mockFile, id: '1' });
      await backend.createFile({ ...mockFile, id: '2' });
      await backend.removeTag(mockTag);
      const dbFiles = await backend.fetchFiles('id', 'DESC');
      expect(dbFiles).toHaveLength(2);
      expect(dbFiles[0].tags).toHaveLength(0);
      expect(dbFiles[1].tags).toHaveLength(0);
    });
  });
});
