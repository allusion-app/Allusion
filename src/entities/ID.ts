import { v4 as uuid } from 'uuid';

export type ID = string;

/** Identifier for resources
 *
 * Resources are in the context of this application data that is stored in the
 * backend (external data). Each resource has an identifier to make it possible
 * to retrieve them from the database.
 */
export interface IResource {
  id: ID;
}

/** Converting client objects into database objects */
export interface ISerializable<S, P = unknown> {
  serialize(arg: P): S;
}

export function generateId(): ID {
  return uuid();
}
