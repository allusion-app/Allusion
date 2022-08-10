import { ID } from './id';

export type LocationDTO = {
  id: ID;
  path: string;
  dateAdded: Date;
  subLocations: SubLocationDTO[];
  index: number;
};

export type SubLocationDTO = {
  name: string;
  isExcluded: boolean;
  subLocations: SubLocationDTO[];
};
