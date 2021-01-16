
let wasm;

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
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

let WASM_VECTOR_LEN = 0;

let cachedTextEncoder = new TextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

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
/**
* @param {string} name
*/
export function greet(name) {
    var ptr0 = passStringToWasm0(name, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    wasm.greet(ptr0, len0);
}

/**
*/
export class Layout {

    static __wrap(ptr) {
        const obj = Object.create(Layout.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_layout_free(ptr);
    }
    /**
    * @param {number} length
    * @param {number} thumbnail_size
    * @param {number} padding
    * @returns {Layout}
    */
    static new(length, thumbnail_size, padding) {
        var ret = wasm.layout_new(length, thumbnail_size, padding);
        return Layout.__wrap(ret);
    }
    /**
    * @param {number} new_len
    */
    resize(new_len) {
        wasm.layout_resize(this.ptr, new_len);
    }
    /**
    * @returns {number}
    */
    items() {
        var ret = wasm.layout_items(this.ptr);
        return ret;
    }
    /**
    * @returns {number}
    */
    top_offsets() {
        var ret = wasm.layout_top_offsets(this.ptr);
        return ret;
    }
    /**
    * @param {number} index
    * @param {number} width
    * @param {number} height
    */
    set_item_input(index, width, height) {
        wasm.layout_set_item_input(this.ptr, index, width, height);
    }
    /**
    * @param {number} thumbnail_size
    */
    set_thumbnail_size(thumbnail_size) {
        wasm.layout_set_thumbnail_size(this.ptr, thumbnail_size);
    }
    /**
    * @param {number} padding
    */
    set_padding(padding) {
        wasm.layout_set_padding(this.ptr, padding);
    }
    /**
    * @param {number} container_width
    * @returns {number}
    */
    compute_horizontal(container_width) {
        var ret = wasm.layout_compute_horizontal(this.ptr, container_width);
        return ret;
    }
    /**
    * @param {number} container_width
    * @returns {number}
    */
    compute_vertical(container_width) {
        var ret = wasm.layout_compute_vertical(this.ptr, container_width);
        return ret;
    }
}
/**
*/
export class Transform {

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_transform_free(ptr);
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

async function init(input) {
    if (typeof input === 'undefined') {
        input = import.meta.url.replace(/\.js$/, '_bg.wasm');
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_alert_6dba17b5669ddfd8 = function(arg0, arg1) {
        alert(getStringFromWasm0(arg0, arg1));
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
    };

    if (typeof input === 'string' || (typeof Request === 'function' && input instanceof Request) || (typeof URL === 'function' && input instanceof URL)) {
        input = fetch(input);
    }

    const { instance, module } = await load(await input, imports);

    wasm = instance.exports;
    init.__wbindgen_wasm_module = module;

    return wasm;
}

export default init;

