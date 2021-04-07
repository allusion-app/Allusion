
let wasm;

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
/**
*/
export class Layout {

    static __wrap(ptr) {
        const obj = Object.create(Layout.prototype);
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
        return ret >>> 0;
    }
    /**
    * @param {number} container_width
    * @returns {number}
    */
    compute_vertical(container_width) {
        var ret = wasm.layout_compute_vertical(this.ptr, container_width);
        return ret >>> 0;
    }
    /**
    * @param {number} container_width
    * @returns {number}
    */
    compute_grid(container_width) {
        var ret = wasm.layout_compute_grid(this.ptr, container_width);
        return ret >>> 0;
    }
}
/**
*/
export class Transform {

    __destroy_into_raw() {
        const ptr = this.ptr;
        this.ptr = 0;

        return ptr;
    }

    free() {
        const ptr = this.__destroy_into_raw();
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

async function init(input, maybe_memory) {
    if (typeof input === 'undefined') {
        input = new URL('masonry_bg.wasm', import.meta.url);
    }
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm0(arg0, arg1));
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

