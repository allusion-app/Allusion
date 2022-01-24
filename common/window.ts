const params = new URLSearchParams(window.location.search.slice(1));
export const IS_PREVIEW_WINDOW = params.get('preview') === 'true';

// Window State
export const WINDOW_STORAGE_KEY = 'Allusion_Window';
