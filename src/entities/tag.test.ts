import TagStore from 'src/frontend/stores/TagStore';
import { ROOT_TAG_ID } from '../api/tag';

jest.mock('../api/id', () => ({
  // This makes me very unhappy.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  generateId: () => require('crypto').randomUUID(),
}));

describe('ClientTag', () => {
  function createStore() {
    const backend = {
      createTag: async () => {},
    } as any;
    const rootStore = {} as any;
    const store = new TagStore(backend, rootStore);
    store.init([
      {
        id: ROOT_TAG_ID,
        name: 'Root',
        dateAdded: new Date(),
        parent: '',
        position: '',
        color: '',
        isHidden: false,
      },
    ]);
    return store;
  }

  describe('getAncestors', () => {
    it('should return nothing for the root tag', () => {
      const store = createStore();

      const ancestors = Array.from(store.root.getAncestors());

      expect(ancestors).toHaveLength(0);
    });

    it('should return the tag itself', async () => {
      const store = createStore();
      const root = store.root;
      const tag = await store.create(root, 'myTag');

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe(tag.id);
    });

    it('should return the tag itself, its parent and grand-parent', async () => {
      const store = createStore();
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
    it('should be false when testing against itself', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');

      expect(tag1.isAncestor(tag1)).toBeFalsy();
    });

    it('should check if a tag is a direct parent', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(tag2.isAncestor(tag1)).toBeTruthy();
    });

    it('should be false when testing a child tag', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(tag1.isAncestor(tag2)).toBeFalsy();
    });

    it('should check if a tag is an indirect parent', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');
      const tag3 = await store.create(tag2, 'tag3');

      expect(tag3.isAncestor(tag1)).toBeTruthy();
    });
  });

  describe('insertSubTag', () => {
    it('should not allow a tag to be inserted on itself', () => {
      const store = createStore();
      const tag1 = store.root;
      expect(store.move(tag1, tag1, 0)).toBeFalsy();
    });

    it('should not allow a tag to be inserted that is a parent of the given tag', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(store.move(tag2, tag1, 0)).toBeFalsy();
      expect(tag2.parent).toBe(tag1);
    });

    it('should not insert if parent and position do not change', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(store.move(tag1, tag2, 0)).toBeFalsy();
      expect(tag2.parent).toBe(tag1);
    });

    it('should insert a tag to an indirect parent', async () => {
      const store = createStore();
      const root = store.root;
      const tag1 = await store.create(root, 'tag1');
      const tag2 = await store.create(tag1, 'tag2');

      expect(store.move(root, tag2, 0)).toBeTruthy();
      expect(tag2.parent).toBe(root);
    });
  });
});
