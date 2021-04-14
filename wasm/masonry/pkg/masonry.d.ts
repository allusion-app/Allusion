/* tslint:disable */
/* eslint-disable */
/**
* Function to be called in the web worker thread to compute the new layout.
*
* # Safety
*
* Do not import this function as it is already imported into the web worker thread (see
* `create_web_worker`). The pointer send to it must be created in the same memory used for the
* creation of the WebAssembly module both in the main and web worker thread.
* @param {number} computation_ptr
* @returns {number | undefined}
*/
export function execute(computation_ptr: number): number | undefined;
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
* Creates a new web worker from the path to `masonry.js` and `masonry_bg.wasm`.
* @param {number} num_items
* @param {string} module_path
* @param {string} wasm_path
*/
  constructor(num_items: number, module_path: string, wasm_path: string);
/**
* Initializes the web worker, so it can handle future computations.
*
* # Safety
*
* Calling this function more than once on an instance will immediately panic. It is
* important to `await` the `Promise`, otherwise the first computation will be skipped.
* @returns {Promise<any>}
*/
  init(): Promise<any>;
/**
* Computes the transforms of all items and returns the height of the container.
*
* # Safety
*
* The returned `Promise` must be `await`ed. Calls to any other method of [`MasonryWorker`]
* while the `Promise` is still pending can lead to undefined behaviour. As long as the value
* is `await`ed you can enjoy lock free concurrency.
* @param {number} width
* @param {number} kind
* @param {number} thumbnail_size
* @param {number} padding
* @returns {Promise<any>}
*/
  compute(width: number, kind: number, thumbnail_size: number, padding: number): Promise<any>;
/**
* Set the number of items that need to be computed.
*
* Memory is never deallocated which means that even if the new len is smaller than the current
* item count, it will not free the memory of previous items. This is done to avoid allocating
* a lot. Allocations can be vary in performance depending on the provided allocator. This
* makes no efforts and uses the standard library allocator.
* @param {number} new_len
*/
  resize(new_len: number): void;
/**
* Set the dimension of one item at the given index.
*
* You have to set the dimensions of the items if you want to compute a vertical or horizontal
* masonry layout. For grid layout this is not necessary.
*
* # Panics
*
* If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
* @param {number} index
* @param {number} src_width
* @param {number} src_height
*/
  set_dimension(index: number, src_width: number, src_height: number): void;
/**
* Returns the transform of the item at the given index.
*
* The [`Transform`] object can be used to set the absolute position of an element.
*
* # Panics
*
* If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
* @param {number} index
* @returns {any}
*/
  get_transform(index: number): any;
}
/**
*/
export class Receiver {
  free(): void;
/**
* @param {number} ptr
* @returns {Receiver}
*/
  static from_ptr(ptr: number): Receiver;
/**
* @returns {number}
*/
  receive(): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_masonryworker_free: (a: number) => void;
  readonly masonryworker_new: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly masonryworker_init: (a: number) => number;
  readonly masonryworker_compute: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly masonryworker_resize: (a: number, b: number) => void;
  readonly masonryworker_set_dimension: (a: number, b: number, c: number, d: number) => void;
  readonly masonryworker_get_transform: (a: number, b: number) => number;
  readonly execute: (a: number, b: number) => void;
  readonly __wbg_receiver_free: (a: number) => void;
  readonly receiver_from_ptr: (a: number) => number;
  readonly receiver_receive: (a: number) => number;
  readonly __wbindgen_export_0: WebAssembly.Memory;
  readonly __wbindgen_export_1: WebAssembly.Table;
  readonly wasm_bindgen__convert__closures__invoke1_mut__hae1aa38dc1391970: (a: number, b: number, c: number) => void;
  readonly __wbindgen_malloc: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_exn_store: (a: number) => void;
  readonly wasm_bindgen__convert__closures__invoke2_mut__h04b557a7effa519a: (a: number, b: number, c: number, d: number) => void;
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
