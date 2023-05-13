import { ID } from './id';

export const ROOT_TAG_ID = 'root';

export type TagDTO = {
  id: ID;
  name: string;
  dateAdded: Date;
  color: string;
  parent: ID;
  position: string;
  /** Whether any files with this tag should be hidden */
  isHidden: boolean;
};
