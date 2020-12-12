import { useCallback, useState, useEffect } from 'react';

function useRoveFocus(size: number): [number, (index: number) => void] {
  const [currentFocus, setCurrentFocus] = useState(0);
  // console.log(currentFocus, size);
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        // Down arrow
        e.preventDefault();
        e.stopPropagation();
        setCurrentFocus(currentFocus === size - 1 ? 0 : currentFocus + 1);
      } else if (e.key === 'ArrowUp') {
        // Up arrow
        e.preventDefault();
        e.stopPropagation();
        setCurrentFocus(currentFocus === 0 ? size - 1 : currentFocus - 1);
      }
    },
    [size, currentFocus, setCurrentFocus],
  );

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown, false);
    return () => document.removeEventListener('keydown', handleKeyDown, false);
  }, [handleKeyDown]);

  return [currentFocus, setCurrentFocus];
}

export default useRoveFocus;
