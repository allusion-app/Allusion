// Mocks the DBRepository file with the one defined in the __mocks__ directory
jest.mock('./DBRepository');
jest.mock('./BackupScheduler');
jest.mock('../Messaging', () => ({
  RendererMessenger: {
    getDefaultBackupDirectory() {
      return Promise.resolve('/tmp');
    },
  },
}));

import Backend from './Backend';
import { TagDTO, ROOT_TAG_ID } from 'src/api/TagDTO';
import { FileDTO } from 'src/api/FileDTO';
import { OrderDirection } from 'src/api/FileSearchDTO';

let backend = new Backend();

const mockTag: TagDTO = {
  id: 'tag1',
  name: 'tag1 name',
  dateAdded: new Date(),
  color: '',
  subTags: [],
  isHidden: false,
};

const mockFile: FileDTO = {
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
  dateLastIndexed: new Date(),
  extension: 'jpg',
  ino: '1234',
  id: '1234',
  tags: [mockTag.id],
};

describe('Backend', () => {
  describe('Tag API', () => {
    beforeEach(async () => {
      backend = await Backend.connect();
    });

    it('should be able to fetch a tag after adding it', async () => {
      await backend.createTag({ ...mockTag });
      const dbTags = await backend.fetchTags();
      expect(dbTags).toHaveLength(2);
      expect(dbTags[0].id).toBe(ROOT_TAG_ID);
      expect(dbTags[1].id).toBe(mockTag.id);
    });

    describe('removeTag', () => {
      it('should remove the tag from all files with that tag when removing that tag', async () => {
        await backend.createTag({ ...mockTag });
        await backend.createFiles([
          { ...mockFile, id: '1', tags: [mockTag.id] },
          { ...mockFile, id: '2' },
        ]);
        await backend.removeTags([mockTag.id]);
        const dbFiles = await backend.fetchFiles('id', OrderDirection.Desc);
        expect(dbFiles).toHaveLength(2);
        expect(dbFiles[0].tags).toHaveLength(0);
        expect(dbFiles[1].tags).toHaveLength(0);
      });

      it('should not remove other tags from the files of which a tag was deleted', async () => {
        await backend.createTag({ ...mockTag, id: 'tag1' });
        await backend.createTag({ ...mockTag, id: 'tag2' });
        await backend.createFiles([{ ...mockFile, id: '1', tags: ['tag1', 'tag2'] }]);
        await backend.removeTags(['tag1']);

        const dbFiles = await backend.fetchFiles('id', OrderDirection.Desc);

        expect(dbFiles).toHaveLength(1);

        expect(dbFiles[0].tags).toHaveLength(1);
        expect(dbFiles[0].tags[0]).toBe('tag2');
      });
    });

    describe('removeTags', () => {
      it('should remove only the tags that were deleted from the files that had them', async () => {
        await backend.createTag({ ...mockTag, id: 'tag1' });
        await backend.createTag({ ...mockTag, id: 'tag2' });
        await backend.createTag({ ...mockTag, id: 'tag3' });
        await backend.createFiles([{ ...mockFile, id: '1', tags: ['tag1', 'tag2', 'tag3'] }]);
        await backend.removeTags(['tag1', 'tag3']);

        const dbFiles = await backend.fetchFiles('id', OrderDirection.Desc);

        expect(dbFiles).toHaveLength(1);

        expect(dbFiles[0].tags).toHaveLength(1);
        expect(dbFiles[0].tags[0]).toBe('tag2');
      });
    });

    // describe('mergeTags', () => {
    // TODO
    // });
  });
});
