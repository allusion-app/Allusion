import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect, useState } from 'react';
import StoreContext from 'src/frontend/contexts/StoreContext';
import { clamp } from 'src/frontend/utils';

const MIN_OUTLINER_WIDTH = 192; // default of 12 rem
const MAX_OUTLINER_WIDTH = 400;

const OutlinerSplitter = observer(() => {
  const { uiStore } = useContext(StoreContext);
  const [isDragging, setDragging] = useState(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // TODO: Persist outliner width?
    setDragging(true);
    document.body.style.setProperty('--outliner-width', `${e.clientX}px`);
    document.body.style.cursor = 'col-resize';
  }, []);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    document.body.style.cursor = 'inherit';
  }, []);

  const handleMouseMove = action((e: MouseEvent) => {
    if (!isDragging) {
      return;
    }

    if (uiStore.isOutlinerOpen) {
      const w = clamp(e.clientX, MIN_OUTLINER_WIDTH, MAX_OUTLINER_WIDTH);
      document.body.style.setProperty('--outliner-width', `${w}px`);

      // TODO: Automatically collapse if less than 3/4 of min-width?
      if (e.clientX < (MIN_OUTLINER_WIDTH * 3) / 4) {
        uiStore.toggleOutliner();
      }
    } else if (e.clientX >= MIN_OUTLINER_WIDTH) {
      uiStore.toggleOutliner();
    }
  });

  useEffect(() => {
    document.body.addEventListener('mousemove', handleMouseMove);
    document.body.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.body.removeEventListener('mousemove', handleMouseMove);
      document.body.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return uiStore.isOutlinerOpen ? (
    <div id="outliner-splitter" onMouseDown={handleMouseDown} onMouseUp={handleMouseUp} />
  ) : null;
});

export default OutlinerSplitter;
