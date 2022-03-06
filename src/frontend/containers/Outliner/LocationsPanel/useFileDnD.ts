import { useState, useCallback } from 'react';
import { AppToaster } from 'src/frontend/components/Toaster';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import { IExpansionState } from '../../types';
import { onDragOver, isAcceptableType, storeDroppedImage, handleDragLeave } from './dnd';

export const HOVER_TIME_TO_EXPAND = 600;

export const useFileDropHandling = (
  expansionId: string,
  fullPath: string,
  expansion: IExpansionState,
  setExpansion: (s: IExpansionState) => void,
) => {
  // Don't expand immediately, only after hovering over it for a second or so
  const [expandTimeoutId, setExpandTimeoutId] = useState<number>();
  const expandDelayed = useCallback(() => {
    if (expandTimeoutId) {
      clearTimeout(expandTimeoutId);
    }
    const t = window.setTimeout(() => {
      setExpansion({ ...expansion, [expansionId]: true });
    }, HOVER_TIME_TO_EXPAND);
    setExpandTimeoutId(t);
  }, [expandTimeoutId, expansion, expansionId, setExpansion]);

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const canDrop = onDragOver(event);
      if (canDrop && !expansion[expansionId]) {
        expandDelayed();
      }
    },
    [expansion, expansionId, expandDelayed],
  );

  const handleDrop = useCallback(
    async (event: React.DragEvent<HTMLDivElement>) => {
      event.currentTarget.dataset[DnDAttribute.Target] = 'false';

      if (isAcceptableType(event)) {
        event.dataTransfer.dropEffect = 'none';
        try {
          await storeDroppedImage(event, fullPath);
        } catch (e) {
          console.error(e);
          AppToaster.show({
            message: 'Something went wrong, could not import image :(',
            timeout: 100,
          });
        }
      } else {
        AppToaster.show({ message: 'File type not supported :(', timeout: 100 });
      }
    },
    [fullPath],
  );

  const handleDragLeaveWrapper = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      // Drag events are also triggered for children??
      // We don't want to detect dragLeave of a child as a dragLeave of the target element, so return immmediately
      if ((event.target as HTMLElement).contains(event.relatedTarget as HTMLElement)) {
        return;
      }

      event.stopPropagation();
      event.preventDefault();
      handleDragLeave(event);
      if (expandTimeoutId) {
        clearTimeout(expandTimeoutId);
        setExpandTimeoutId(undefined);
      }
    },
    [expandTimeoutId],
  );

  return {
    handleDragEnter,
    handleDrop,
    handleDragLeave: handleDragLeaveWrapper,
  };
};
