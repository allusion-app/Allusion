import { ID } from './ID';

export const ROOT_TAG_ID = 'root';
/* A Tag as it is represented in the Database */

export interface ITag {
  id: ID;
  name: string;
  dateAdded: Date;
  color: string;
  subTags: ID[];
  /** Whether any files with this tag should be hidden */
  isHidden: boolean;
}
