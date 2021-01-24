/* tslint:disable */
/* eslint-disable */
/**
*/
export class Layout {
  free(): void;
/**
* @param {number} length
* @param {number} thumbnail_size
* @param {number} padding
* @returns {Layout}
*/
  static new(length: number, thumbnail_size: number, padding: number): Layout;
/**
* @param {number} new_len
*/
  resize(new_len: number): void;
/**
* @returns {number}
*/
  items(): number;
/**
* @returns {number}
*/
  top_offsets(): number;
/**
* @param {number} thumbnail_size
*/
  set_thumbnail_size(thumbnail_size: number): void;
/**
* @param {number} padding
*/
  set_padding(padding: number): void;
/**
* @param {number} container_width
* @returns {number}
*/
  compute_horizontal(container_width: number): number;
/**
* @param {number} container_width
* @returns {number}
*/
  compute_vertical(container_width: number): number;
/**
* @param {number} container_width
* @returns {number}
*/
  compute_grid(container_width: number): number;
}
/**
*/
export class Transform {
  free(): void;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_transform_free: (a: number) => void;
  readonly __wbg_layout_free: (a: number) => void;
  readonly layout_new: (a: number, b: number, c: number) => number;
  readonly layout_resize: (a: number, b: number) => void;
  readonly layout_items: (a: number) => number;
  readonly layout_top_offsets: (a: number) => number;
  readonly layout_set_thumbnail_size: (a: number, b: number) => void;
  readonly layout_set_padding: (a: number, b: number) => void;
  readonly layout_compute_horizontal: (a: number, b: number) => number;
  readonly layout_compute_vertical: (a: number, b: number) => number;
  readonly layout_compute_grid: (a: number, b: number) => number;
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
        