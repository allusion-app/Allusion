/* tslint:disable */
/* eslint-disable */
/**
* Function to be called in the web worker thread to compute the new layout.
*
* # Safety
*
* Do not import this function as it is already imported into the web worker thread (see
* `worker.js`).
*/
export function run(): void;
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
* Creates a new worker from a worker that was initialized with the `worker.js` script.
* @param {number} num_items
*/
  constructor(num_items: number);
/**
* Computes the transforms of all items.
*
* # Safety
*
* The returned `Promise` must be `await`ed. Calls to any other method of [`MasonryWorker`]
* while the `Promise` is still pending will lead to undefined behaviour. As long as the value
* is `await`ed you can enjoy lock free concurrency.
* @param {number} width
* @param {number} kind
* @param {number} thumbnail_size
* @param {number} padding
* @returns {Promise<any>}
*/
  compute(width: number, kind: number, thumbnail_size: number, padding: number): Promise<any>;
/**
* Returns height of the container from the most recent computation.
* @returns {number}
*/
  get_height(): number;
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
* Returns a pointer to the transform of the item at the given index.
*
* The [`Transform`] object can be used to set the absolute position of an element.
*
* # Panics
*
* If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
* @param {number} index
* @returns {number}
*/
  get_transform(index: number): number;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly __wbg_masonryworker_free: (a: number) => void;
  readonly masonryworker_new: (a: number) => number;
  readonly masonryworker_compute: (a: number, b: number, c: number, d: number, e: number) => number;
  readonly masonryworker_get_height: (a: number) => number;
  readonly masonryworker_resize: (a: number, b: number) => void;
  readonly masonryworker_set_dimension: (a: number, b: number, c: number, d: number) => void;
  readonly masonryworker_get_transform: (a: number, b: number) => number;
  readonly run: () => void;
  readonly memory: WebAssembly.Memory;
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
export default function init (module_or_path: InitInput | Promise<InitInput>, maybe_memory?: WebAssembly.Memory): Promise<InitOutput>;
