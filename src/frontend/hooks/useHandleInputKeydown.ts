import { useCallback } from 'react';

// A custom hook that returns a memoized callback to handle keydown events on
// input elements, preventing interference from gallery navigation keyboard
// shortcuts while allowing navigation when the Alt key is pressed.
export function useGalleryInputKeydownHandler() {
  return useCallback((e: React.KeyboardEvent) => {
    // Allow gallery navigation with Alt + Arrow keys, even when the input is focused.
    if (e.altKey) {
      e.preventDefault();
      return;
    }
    // if Alt is not pressed, stop propagation to keep focus on the selected item.

    switch (e.key) {
      // Prevent backspace from navigating back to main view when having an image open
      case 'Backspace':
      // move text cursor as expected
      case 'ArrowLeft':
      case 'ArrowRight': {
        e.stopPropagation(); //Prevent event to propagate to the gallery
        break;
      }
      default:
        break;
    }
  }, []);
}
