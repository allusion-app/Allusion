import TagStore from 'src/frontend/stores/TagStore';
import { ClientTag } from './Tag';
import { ROOT_TAG_ID } from 'src/api/Tag';

jest.mock('../frontend/stores/TagStore', () => ({
  default: {
    root: null,
    isSelected: jest.fn().mockImplementation(() => false),
  },
}));

describe('ClientTag', () => {
  // const MockedTagStore = TagStore as jest.Mock<TagStore>;
  // const MockedTagStore = mocked<TagStore>({});

  const storeInstance = TagStore as unknown as TagStore;
  storeInstance.isSearched = jest.fn().mockImplementation(() => false);

  const createTag = (props: { id: string; name?: string; color?: string; isHidden?: boolean }) =>
    new ClientTag(
      storeInstance,
      props.id,
      props.name || props.id,
      new Date(),
      props.color || '',
      props.isHidden || false,
    );

  beforeAll(() => {
    // Clear all instances and calls to constructor and all methods:
    // MockedTagStore.mockClear();
    jest.clearAllMocks();
  });

  it('should create an instance', () => {
    expect(createTag({ id: 'myTag' })).toBeTruthy();
  });

  describe('getAncestors', () => {
    it('should return nothing for the root tag', () => {
      const tag = createTag({ id: ROOT_TAG_ID });

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(0);
    });

    it('should return the the tag itself', () => {
      const tag = createTag({ id: 'myTag' });
      const root = createTag({ id: ROOT_TAG_ID });
      tag.setParent(root);

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(1);
      expect(ancestors[0].id).toBe(tag.id);
    });

    it('should return the tag itself, its parent and grand-parent', () => {
      const tag = createTag({ id: 'myTag' });
      const parent = createTag({ id: 'parent' });
      const root = createTag({ id: ROOT_TAG_ID });
      tag.setParent(parent);
      parent.setParent(root);

      const ancestors = Array.from(tag.getAncestors());

      expect(ancestors).toHaveLength(2);
      expect(ancestors[0].id).toBe(tag.id);
      expect(ancestors[1].id).toBe(parent.id);
    });
  });

  describe('isAncestor', () => {
    it('should be false when testing against itself', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });

      tag1.setParent(root);

      expect(tag1.isAncestor(tag1)).toBeFalsy();
    });

    it('should check if a tag is a direct parent', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });
      const tag2 = createTag({ id: 'tag2' });

      tag1.setParent(root);
      tag2.setParent(tag1);

      expect(tag2.isAncestor(tag1)).toBeTruthy();
    });

    it('should be false when testing a child tag', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });
      const tag2 = createTag({ id: 'tag2' });

      (storeInstance as any).root = root;
      tag1.setParent(root);
      tag2.setParent(tag1);

      expect(tag1.isAncestor(tag2)).toBeFalsy();
    });

    it('should check if a tag is an indirect parent', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });
      const tag2 = createTag({ id: 'tag2' });
      const tag3 = createTag({ id: 'tag3' });

      tag1.setParent(root);
      tag2.setParent(tag1);
      tag3.setParent(tag2);

      expect(tag3.isAncestor(tag1)).toBeTruthy();
    });
  });

  describe('insertSubTag', () => {
    it('should not allow a tag to be inserted on itself', () => {
      const tag1 = createTag({ id: ROOT_TAG_ID });
      expect(tag1.insertSubTag(tag1, 0)).toBeFalsy();
    });

    it('should not allow a tag to be inserted that is a parent of the given tag', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });
      const tag2 = createTag({ id: 'tag2' });

      tag1.setParent(root);
      tag2.setParent(tag1);

      expect(tag2.insertSubTag(tag1, 0)).toBeFalsy();
      expect(tag2.parent).toBe(tag1);
    });

    it('should insert a tag to its direct parent', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });
      const tag2 = createTag({ id: 'tag2' });

      tag1.setParent(root);
      tag2.setParent(tag1);
      (storeInstance as any).root = root;

      expect(tag1.insertSubTag(tag2, 0)).toBeTruthy();
      expect(tag2.parent).toBe(tag1);
    });

    it('should insert a tag to an indirect parent', () => {
      const root = createTag({ id: ROOT_TAG_ID });
      const tag1 = createTag({ id: 'tag1' });
      const tag2 = createTag({ id: 'tag2' });

      tag1.setParent(root);
      tag2.setParent(tag1);
      (storeInstance as any).root = root;

      expect(root.insertSubTag(tag2, 0)).toBeTruthy();
      expect(tag2.parent).toBe(root);
    });
  });
});
