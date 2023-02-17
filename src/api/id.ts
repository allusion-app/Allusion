export type ID = string;

export function generateId(): ID {
  // Generates a v4 UUID
  return globalThis.crypto.randomUUID();
}
