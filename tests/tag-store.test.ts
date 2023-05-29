import Backend from '../src/backend/backend';
import { dbInit } from '../src/backend/config';
import TagStore from '../src/frontend/stores/TagStore';

describe('TagStore', () => {
  let TEST_DATABASE_ID_COUNTER = 0;

  function test(name: string, test: (store: TagStore) => Promise<void>) {
    it(name, async () => {
      const db = dbInit(`Test_${TEST_DATABASE_ID_COUNTER++}`);
      const backend = await Backend.init(db, () => {});
      const store = new TagStore(backend, {} as any);
      await store.init();
      await test(store);
    });
  }

  test('should create an instance', async (store) => {
    const tag = await store.create(store.root, 'myTag');
    expect(tag).toBeTruthy();
  });

  describe('getAncestors', () => {
    test('should return nothing for the root tag', async (store) => {
      const tag = store.root;

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(0);
    });

    test('should return the the tag itself', async (store) => {
      const tag = await store.create(store.root, 'myTag');

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe(tag.id);
    });

    test('should return the tag itself, its parent and grand-parent', async (store) => {
      const root = store.root;
      const parent = await store.create(root, 'parent');
      const tag = await store.create(parent, 'myTag');

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe(tag.id);
      expect(ancestors[1].id).toBe(parent.id);
    });
  });

  describe('isAncestor', () => {
    test('should be false when testing against itself', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');

      expect(tag1.isAncestor(tag1)).toBeFalsy();
    });

    test('should check if a tag is a direct parent', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(tag2.isAncestor(tag1)).toBeTruthy();
    });

    test('should be false when testing a child tag', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(tag1.isAncestor(tag2)).toBeFalsy();
    });

    test('should check if a tag is an indirect parent', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');
      const tag3 = await store.create(tag2, 'tag3');

      expect(tag3.isAncestor(tag1)).toBeTruthy();
    });
  });

  describe('insertSubTag', () => {
    test('should not allow a tag to be inserted on itself', async (store) => {
      const tag1 = store.root;
      expect(tag1.insertSubTag(tag1, 0)).toBeFalsy();
    });

    test('should not allow a tag to be inserted that is a parent of the given tag', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(tag2.insertSubTag(tag1, 0)).toBeFalsy();
      expect(tag2.parent).toBe(tag1);
    });

    test('should insert a tag to its direct parent', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(tag1.insertSubTag(tag2, 0)).toBeTruthy();
      expect(tag2.parent).toBe(tag1);
    });

    test('should insert a tag to an indirect parent', async (store) => {
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(root.insertSubTag(tag2, 0)).toBeTruthy();
      expect(tag2.parent).toBe(root);
    });
  });
});
