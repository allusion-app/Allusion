import { v4 as uuid } from 'uuid';

export type ID = string;

export interface IIdentifiable {
  id: ID;
}

export interface ISerializable<S extends IIdentifiable> {
  serialize(): S;
}

export function generateId(): ID {
  return uuid();
}
