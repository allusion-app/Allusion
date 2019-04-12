// Mocks the DBRepository file with the one defined in the __mocks__ directory
jest.mock('./DBRepository');

import Backend from './Backend';
import { ITag } from '../entities/Tag';

let backend: Backend = new Backend();

const mockTag: ITag = {
  id: 'tag1',
  name: 'tag1 name',
  dateAdded: new Date(),
  description: 'tag1 description',
};

describe('Backend', () => {
  beforeAll(() => {
    backend = new Backend();
    return backend.init();
  });
  describe('Tag API', () => {
    it('should be able to fetch a tag after adding it', async () => {
      await backend.createTag(mockTag.id, mockTag.name, mockTag.description);
      const dbTags = await backend.fetchTags();
      expect(dbTags)
        .toHaveLength(1);
      expect(dbTags[0].id)
        .toBe(mockTag.id);
    });
    it('should remove the tag from all files with that tag when removing that tag', async () => {
      await backend.createTag(mockTag.id, mockTag.name, mockTag.description);
      await backend.createFile('file1', 'file1 path', [mockTag.id]);
      await backend.createFile('file2', 'file2 path', [mockTag.id]);
      await backend.removeTag(mockTag);
      const dbFiles = await backend.fetchFiles();
      expect(dbFiles)
        .toHaveLength(2);
      expect(dbFiles[0].tags)
        .toHaveLength(0);
      expect(dbFiles[1].tags)
      .toHaveLength(0);
    });
  });
});
