/* tslint:disable */
/* eslint-disable */
/**
* @param {number} message_ptr
* @returns {number | undefined}
*/
export function execute(message_ptr: number): number | undefined;
/**
*/
export enum MasonryType {
  Vertical,
  Horizontal,
  Grid,
}
/**
*/
export class MasonryWorker {
  free(): void;
/**
* @param {number} num_items
* @param {string} module_path
* @param {string} wasm_path
*/
  constructor(num_items: number, module_path: string, wasm_path: string);
/**
* @param {number} width
* @param {number} kind
* @param {number} thumbnail_size
* @param {number} padding
* @returns {Promise<any>}
*/
  compute(width: number, kind: number, thumbnail_size: number, padding: number): Promise<any>;
/**
* @param {number} new_len
*/
  resize(new_len: number): void;
/**
* @param {number} index
* @param {number} src_width
* @param {number} src_height
*/
  set_dimension(index: number, src_width: number, src_height: number): void;
/**
* @param {number} index
* @returns {any}
*/
  get_transform(index: number): any;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_masonryworker_free: (a: number) => void;
  readonly masonryworker_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly masonryworker_compute: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly masonryworker_resize: (a: number, b: number) => void;
  readonly masonryworker_set_dimension: (a: number, b: number, c: number, d: number) => void;
  readonly masonryworker_get_transform: (a: number, b: number) => number;
  readonly execute: (a: number, b: number) => void;
  readonly __wbindgen_export_0: WebAssembly.Memory;
  readonly __wbindgen_export_1: WebAssembly.Table;
  readonly _dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__ha3850c4b597b863a: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__he8da1be40d9acc4c: (a: number, b: number, c: number, d: number) => void;
  readonly __wbindgen_start: () => void;
}

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
* @param {WebAssembly.Memory} maybe_memory
*
* @returns {Promise<InitOutput>}
*/
export default function init (module_or_path?: InitInput | Promise<InitInput>, maybe_memory?: WebAssembly.Memory): Promise<InitOutput>;
