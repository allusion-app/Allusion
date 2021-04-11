
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
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.__wbindgen_export_0.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.__wbindgen_export_0.buffer);
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
function __wbg_adapter_16(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__ha3850c4b597b863a(arg0, arg1, addHeapObject(arg2));
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
};

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.__wbindgen_export_0.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.__wbindgen_export_0.buffer);
    }
    return cachegetInt32Memory0;
}
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
export function execute(computation_ptr) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm.execute(retptr, computation_ptr);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        return r0 === 0 ? undefined : r1 >>> 0;
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function handleError(f) {
    return function () {
        try {
            return f.apply(this, arguments);

        } catch (e) {
            wasm.__wbindgen_exn_store(addHeapObject(e));
        }
    };
}
function __wbg_adapter_57(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__he8da1be40d9acc4c(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
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
    * @param {string} module_path
    * @param {string} wasm_path
    */
    constructor(num_items, module_path, wasm_path) {
        var ptr0 = passStringToWasm0(module_path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passStringToWasm0(wasm_path, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len1 = WASM_VECTOR_LEN;
        var ret = wasm.masonryworker_new(num_items, ptr0, len0, ptr1, len1);
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
    get_transform(index) {
        var ret = wasm.masonryworker_get_transform(this.ptr, index);
        return takeObject(ret);
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
    if (typeof input === 'undefined') {
        input = new URL('masonry_bg.wasm', import.meta.url);
    }
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
    imports.wbg.__wbindgen_string_new = function(arg0, arg1) {
        var ret = getStringFromWasm0(arg0, arg1);
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_is_undefined = function(arg0) {
        var ret = getObject(arg0) === undefined;
        return ret;
    };
    imports.wbg.__wbg_newwithblobsequenceandoptions_2fda24fb77fd3cd5 = handleError(function(arg0, arg1) {
        var ret = new Blob(getObject(arg0), getObject(arg1));
        return addHeapObject(ret);
    });
    imports.wbg.__wbg_data_b7536deeccc3c114 = function(arg0) {
        var ret = getObject(arg0).data;
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_createObjectURL_edd61e4503694e62 = handleError(function(arg0, arg1) {
        var ret = URL.createObjectURL(getObject(arg1));
        var ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        var len0 = WASM_VECTOR_LEN;
        getInt32Memory0()[arg0 / 4 + 1] = len0;
        getInt32Memory0()[arg0 / 4 + 0] = ptr0;
    });
    imports.wbg.__wbg_setonmessage_c939dadfb4a56419 = function(arg0, arg1) {
        getObject(arg0).onmessage = getObject(arg1);
    };
    imports.wbg.__wbg_newwithoptions_174c000ca3f1e310 = handleError(function(arg0, arg1, arg2) {
        var ret = new Worker(getStringFromWasm0(arg0, arg1), getObject(arg2));
        return addHeapObject(ret);
    });
    imports.wbg.__wbg_postMessage_a9a8b804156efaa3 = handleError(function(arg0, arg1) {
        getObject(arg0).postMessage(getObject(arg1));
    });
    imports.wbg.__wbg_terminate_0bfb6ab3b09a7c5e = function(arg0) {
        getObject(arg0).terminate();
    };
    imports.wbg.__wbg_call_cb478d88f3068c91 = handleError(function(arg0, arg1) {
        var ret = getObject(arg0).call(getObject(arg1));
        return addHeapObject(ret);
    });
    imports.wbg.__wbg_new_8528c110a833413f = function() {
        var ret = new Array();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_push_17a514d8ab666103 = function(arg0, arg1) {
        var ret = getObject(arg0).push(getObject(arg1));
        return ret;
    };
    imports.wbg.__wbg_new_3639cca8cb89b0b4 = function(arg0) {
        var ret = new SharedArrayBuffer(arg0 >>> 0);
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_notify_f85299c7d941c13b = handleError(function(arg0, arg1, arg2) {
        var ret = Atomics.notify(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
        return ret;
    });
    imports.wbg.__wbg_store_77f99942b343656f = handleError(function(arg0, arg1, arg2) {
        var ret = Atomics.store(getObject(arg0), arg1 >>> 0, arg2);
        return ret;
    });
    imports.wbg.__wbg_call_f5e0576f61ee7461 = handleError(function(arg0, arg1, arg2) {
        var ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
        return addHeapObject(ret);
    });
    imports.wbg.__wbg_new_d14bf16e62c6b3d5 = function() {
        var ret = new Object();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_set_61642586f7156f4a = handleError(function(arg0, arg1, arg2) {
        var ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
        return ret;
    });
    imports.wbg.__wbg_parse_13ee9d835244eb72 = handleError(function(arg0, arg1) {
        var ret = JSON.parse(getStringFromWasm0(arg0, arg1));
        return addHeapObject(ret);
    });
    imports.wbg.__wbg_new_3ea8490cd276c848 = function(arg0, arg1) {
        try {
            var state0 = {a: arg0, b: arg1};
            var cb0 = (arg0, arg1) => {
                const a = state0.a;
                state0.a = 0;
                try {
                    return __wbg_adapter_57(a, state0.b, arg0, arg1);
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
    imports.wbg.__wbg_new_5c2190a641284929 = function(arg0) {
        var ret = new Int32Array(getObject(arg0));
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_rethrow = function(arg0) {
        throw takeObject(arg0);
    };
    imports.wbg.__wbindgen_memory = function() {
        var ret = wasm.__wbindgen_export_0;
        return addHeapObject(ret);
    };
    imports.wbg.__wbindgen_closure_wrapper34 = function(arg0, arg1, arg2) {
        var ret = makeMutClosure(arg0, arg1, 3, __wbg_adapter_16);
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

