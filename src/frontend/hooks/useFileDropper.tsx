import { useEffect, useRef, useState } from 'react';

export const ALLOWED_DROP_TYPES = ['Files', 'text/html', 'text/plain'];

/**
 * Could go native... https://www.fileside.app/blog/2019-04-22_fixing-drag-and-drop/
 * But sounds like it's still not quite desirable
 */

const useFileDropper = () => {
  const enterCount = useRef(0);
  const [isDropping, setIsDropping] = useState(false);

  useEffect(() => {
    const handleDragEnter = (e: DragEvent) => {
      enterCount.current++;

      // We only have to check once, until drag leave
      if (enterCount.current > 1) return;

      // Detect whether the drag event came from within Allusion
      // FIXME: Yes, this is hacky. But... The native drag event does not allow you to specify any metadata, just a list of files...
      const w = window as any;
      const isInternalEvent =
        w.internalDragStart &&
        new Date().getTime() - (w.internalDragStart as Date)?.getTime() < 300;
      if (!isInternalEvent) {
        const isCorrectType = e.dataTransfer?.types.some(type => ALLOWED_DROP_TYPES.includes(type));
        if (isCorrectType) {
          setIsDropping(true);
        }
      }
    };

    const handleDragLeave = () => {
      enterCount.current--;

      if (enterCount.current === 0) {
        setIsDropping(false);
      }
    };

    const handleDrop = () => {
      enterCount.current = 0;
      setIsDropping(false);
    };

    document.body.addEventListener('dragenter', handleDragEnter);
    document.body.addEventListener('dragleave', handleDragLeave);
    document.body.addEventListener('drop', handleDrop);
    return () => {
      document.body.removeEventListener('dragenter', handleDragEnter);
      document.body.removeEventListener('dragleave', handleDragLeave);
      document.body.removeEventListener('drop', handleDrop);
    }
  }, [isDropping]);

  return {
    isDropping,
  };
};

export default useFileDropper;
