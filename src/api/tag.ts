import { ID } from './id';

export const ROOT_TAG_ID = 'root';

export type TagDTO = {
  id: ID;
  name: string;
  dateAdded: Date;
  dateModified: Date;
  color: string;
  parentId: ID;
  /** Whether any files with this tag should be hidden */
  isHidden: boolean;
};
