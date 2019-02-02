import { ID, IIdentifiable } from './ID';

export interface IFile extends IIdentifiable {
  id: ID;
  path: string;
  tags: ID[];
  dateAdded: Date;
}

export class File implements IFile {
  public id: ID;
  public path: string;
  public tags: ID[];
  public dateAdded: Date;

  constructor(id: ID, path: string, tags?: ID[]) {
    this.id = id;
    this.path = path;
    this.tags = tags;
    this.dateAdded = new Date();
  }
}