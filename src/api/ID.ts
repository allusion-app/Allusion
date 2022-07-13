import { v4 as uuid } from 'uuid';

export type ID = string;

export function generateId(): ID {
  return uuid();
}
