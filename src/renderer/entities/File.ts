import { ID, IIdentifiable } from "./ID";

export interface IFile extends IIdentifiable {
  id: ID;
  tags: ID[];
  path: string;
  dateAdded: Date;
}
