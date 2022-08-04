import { ID } from './ID';

export interface ILocation {
  id: ID;
  path: string;
  dateAdded: Date;
  subLocations: ISubLocation[];
  index: number;
}

export interface ISubLocation {
  name: string;
  isExcluded: boolean;
  subLocations: ISubLocation[];
}
