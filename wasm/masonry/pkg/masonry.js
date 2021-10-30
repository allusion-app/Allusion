
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

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
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

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_1.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}
function __wbg_adapter_14(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h4fe7e1dc040e9e90(arg0, arg1, addHeapObject(arg2));
}

/**
* Function to be called in the web worker thread to compute the new layout.
*
* # Safety
*
* Do not import this function as it is already imported into the web worker thread (see
* `create_web_worker`).
* @returns {number}
*/
export function compute() {
    var ret = wasm.compute();
    return ret >>> 0;
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}
function __wbg_adapter_31(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h6973e140705c80d6(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
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
    * Creates a new web worker from the path to `masonry.js` and `masonry_bg.wasm`.
    * @param {number} num_items
    * @param {Worker} worker
    */
    constructor(num_items, worker) {
        var ret = wasm.masonryworker_new(num_items, addHeapObject(worker));
        return MasonryWorker.__wrap(ret);
    }
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
    compute(width, kind, thumbnail_size, padding) {
        var ret = wasm.masonryworker_compute(this.ptr, width, kind, thumbnail_size, padding);
        return takeObject(ret);
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
    set_dimension(index, src_width, src_height) {
        wasm.masonryworker_set_dimension(this.ptr, index, src_width, src_height);
    }
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
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_cb_drop = function(arg0) {
        const obj = takeObject(arg0).original;
        if (obj.cnt-- == 1) {
            obj.a = 0;
            return true;
        }
        var ret = false;
        return ret;
    };
    imports.wbg.__wbindgen_object_clone_ref = function(arg0) {
        var ret = getObject(arg0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_data_9e55e7d79ab13ef1 = function(arg0) {
        var ret = getObject(arg0).data;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_setonmessage_6476b98f78b884f1 = function(arg0, arg1) {
        getObject(arg0).onmessage = getObject(arg1);
    };
    imports.wbg.__wbg_postMessage_19f6e3c6d1114464 = function() { return handleError(function (arg0, arg1) {
        getObject(arg0).postMessage(getObject(arg1));
    }, arguments) };
    imports.wbg.__wbg_of_0df8f35f9ca22da0 = function(arg0) {
        var ret = Array.of(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_call_346669c262382ad7 = function() { return handleError(function (arg0, arg1, arg2) {
        var ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    }, arguments) };
    imports.wbg.__wbg_new_b1d61b5687f5e73a = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_31(a, state0.b, arg0, arg1);
                } finally {
                    state0.a = a;
                }
            };
            var ret = new Promise(cb0);
            return addHeapObject(ret);
        } finally {
            state0.a = state0.b = 0;
        }
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_rethrow = function(arg0) {
        throw takeObject(arg0);
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.memory;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper18 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 3, __wbg_adapter_14);
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

