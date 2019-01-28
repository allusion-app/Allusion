import { v4 as uuid } from 'uuid';

export type ID = string;

export interface IIdentifiable {
  id: ID;
}

export function generateId(): ID {
  return uuid();
}
