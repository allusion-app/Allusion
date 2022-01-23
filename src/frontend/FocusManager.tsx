// Keeping it simple for now.
// Could also keep track of focused elements and restore focus to previouis element when needed.
// but that's not what we need right now
const FocusManager = {
  focusGallery: () => {
    const elem = document.getElementById('gallery-content');
    if (elem) {
      elem.focus({ preventScroll: true });
    } else {
      console.warn(
        // eslint-disable-next-line prettier/prettier
        'Tried to focus #gallery-content, but the element was not found. What\'s going on?!',
      );
    }
  },
};

export default FocusManager;
