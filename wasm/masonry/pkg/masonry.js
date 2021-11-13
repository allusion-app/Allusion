
let wasm;

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().slice(ptr, ptr + len));
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}
/**
* Function to be called in the web worker thread to compute the new layout.
*
* # Safety
*
* Do not import this function as it is already imported into the web worker thread (see
* `worker.js`).
*/
export function run() {
    wasm.run();
}

/**
*/
export const MasonryType = Object.freeze({ Vertical:0,"0":"Vertical",Horizontal:1,"1":"Horizontal",Grid:2,"2":"Grid", });
/**
*/
export class MasonryWorker {

    static __wrap(ptr) {
        const obj = Object.create(MasonryWorker.prototype);
        obj.ptr = ptr;

        return obj;
    }

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_masonryworker_free(ptr);
    }
    /**
    * Creates a new worker from a worker that was initialized with the `worker.js` script.
    * @param {number} num_items
    */
    constructor(num_items) {
        var ret = wasm.masonryworker_new(num_items);
        return MasonryWorker.__wrap(ret);
    }
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
    compute(width, kind, thumbnail_size, padding) {
        var ret = wasm.masonryworker_compute(this.ptr, width, kind, thumbnail_size, padding);
        return takeObject(ret);
    }
    /**
    * Returns height of the container from the most recent computation.
    * @returns {number}
    */
    get_height() {
        var ret = wasm.masonryworker_get_height(this.ptr);
        return ret >>> 0;
    }
    /**
    * Set the number of items that need to be computed.
    *
    * Memory is never deallocated which means that even if the new len is smaller than the current
    * item count, it will not free the memory of previous items. This is done to avoid allocating
    * a lot. Allocations can be vary in performance depending on the provided allocator. This
    * makes no efforts and uses the standard library allocator.
    * @param {number} new_len
    */
    resize(new_len) {
        wasm.masonryworker_resize(this.ptr, new_len);
    }
    /**
    * Set the dimension of one item at the given index if it is smaller than the item count.
    *
    * You have to set the dimensions of the items if you want to compute a vertical or horizontal
    * masonry layout. For grid layout this is not necessary.
    * @param {number} index
    * @param {number} src_width
    * @param {number} src_height
    */
    set_dimension(index, src_width, src_height) {
        wasm.masonryworker_set_dimension(this.ptr, index, src_width, src_height);
    }
    /**
    * Returns a pointer to the transform of the item at the given index.
    *
    * The [`Transform`] object can be used to set the absolute position of an element.
    *
    * # Safety
    *
    * If the index is greater than any number passed to [`MasonryWorker::resize()`], it will
    * return a null pointer. Reading the WebAssembly.Memory will only return garbage.
    * @param {number} index
    * @returns {number}
    */
    get_transform(index) {
        var ret = wasm.masonryworker_get_transform(this.ptr, index);
        return ret;
    }
}

async function load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);

            } catch (e) {
                if (module.headers.get('Content-Type') != 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else {
                    throw e;
                }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);

    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };

        } else {
            return instance;
        }
    }
}

async function init(input, maybe_memory) {

    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_waitAsync_df6dd3a2a5307a2a = function(arg0, arg1, arg2) {
        var ret = Atomics.waitAsync(getObject(arg0), arg1, arg2);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbg_async_b131bfa206aa5cd9 = function(arg0) {
        var ret = getObject(arg0).async;
        return ret;
    };
    imports.wbg.__wbg_value_a932af9bbe40ab5a = function(arg0) {
        var ret = getObject(arg0).value;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_buffer_397eaa4d72ee94dd = function(arg0) {
        var ret = getObject(arg0).buffer;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_resolve_d23068002f584f22 = function(arg0) {
        var ret = Promise.resolve(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_newwithbyteoffsetandlength_c6cf704931530b90 = function(arg0, arg1, arg2) {
        var ret = new Int32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.memory;
        return addHeapObject(ret);
    };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    imports.wbg.memory = maybe_memory || new WebAssembly.Memory({initial:17,maximum:16384,shared:true});

    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;
    wasm.__wbindgen_start();
    return wasm;
}

export default init;

