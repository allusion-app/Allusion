import React, { useCallback, useEffect, useState } from 'react';
import { clamp } from 'src/frontend/utils';

const MIN_OUTLINER_WIDTH = 200;
const MAX_OUTLINER_WIDTH = 400;

const OutlinerSplitter = () => {

  const [isDragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // TODO: Persist outliner width?
    // TODO: Automatically collapse if less than MIN?
    setDragging(true);
    document.body.style.setProperty('--outliner-width', `${e.clientX}px`);
    document.body.style.cursor = 'col-resize';
  }, []);

  useEffect(() => {
    if (!isDragging) {
      return;
    }
    const handleMove = (e: MouseEvent) => {
      const w = clamp(e.clientX, MIN_OUTLINER_WIDTH, MAX_OUTLINER_WIDTH);
      document.body.style.setProperty('--outliner-width', `${w}px`);
    };

    const handleUp = () => {
      setDragging(false);
      document.body.style.cursor = 'inherit';
    };
    document.body.addEventListener('mousemove', handleMove);
    document.body.addEventListener('mouseup', handleUp);

    return () => {
      document.body.removeEventListener('mousemove', handleMove);
      document.body.removeEventListener('mouseup', handleUp);
    }
  }, [isDragging]);

  return (
    <div
      id="outliner-splitter"
      onMouseDown={handleMouseDown}
    />
  );
};

export default OutlinerSplitter;
