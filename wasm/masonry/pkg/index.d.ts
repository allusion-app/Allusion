/* tslint:disable */
/* eslint-disable */
/**
* @param {string} name
*/
export function greet(name: string): void;
/**
*/
export class Layout {
  free(): void;
/**
* @param {number} length
* @param {number} thumbnail_size
* @returns {Layout}
*/
  static new(length: number, thumbnail_size: number): Layout;
/**
* @returns {number}
*/
  items(): number;
/**
* @param {number} index
* @param {number} width
* @param {number} height
*/
  set_item_input(index: number, width: number, height: number): void;
/**
* @param {number} thumbnail_size
*/
  set_thumbnail_size(thumbnail_size: number): void;
/**
* @param {number} container_width
* @param {number} padding
* @returns {number}
*/
  compute(container_width: number, padding: number): number;
}
/**
*/
export class Transform {
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly greet: (a: number, b: number) => void;
  readonly __wbg_transform_free: (a: number) => void;
  readonly __wbg_layout_free: (a: number) => void;
  readonly layout_new: (a: number, b: number) => number;
  readonly layout_items: (a: number) => number;
  readonly layout_set_item_input: (a: number, b: number, c: number, d: number) => void;
  readonly layout_set_thumbnail_size: (a: number, b: number) => void;
  readonly layout_compute: (a: number, b: number, c: number) => number;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
        