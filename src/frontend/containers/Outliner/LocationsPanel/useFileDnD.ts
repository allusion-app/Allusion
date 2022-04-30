import { humanFileSize } from 'common/fmt';
import fse from 'fs-extra';
import path from 'path';
import { useCallback, useState } from 'react';
import { ClientFile } from 'src/entities/File';
import { ClientLocation } from 'src/entities/Location';
import { AppToaster } from 'src/frontend/components/Toaster';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import FileStore from 'src/frontend/stores/FileStore';
import { RendererMessenger } from 'src/Messaging';
import { IExpansionState } from '../../types';
import {
  findDroppedFileMatches,
  getDropData,
  handleDragLeave,
  isAcceptableType,
  onDragOver,
  storeDroppedImage,
} from './dnd';

export const HOVER_TIME_TO_EXPAND = 600;

/**
 * Either moves or downloads a dropped file into the target directory
 * @param fileStore
 * @param matches
 * @param dir
 */
const handleMove = async (
  fileStore: FileStore,
  matches: ClientFile[],
  loc: ClientLocation,
  dir: string,
) => {
  let isReplaceAllActive = false;

  // If it's a file being dropped that's already in Allusion, move it
  for (const file of matches) {
    const src = path.normalize(file.absolutePath);
    const dst = path.normalize(path.join(dir, file.name));
    if (src !== dst) {
      const alreadyExists = await fse.pathExists(dst);

      if (alreadyExists && !isReplaceAllActive) {
        const srcStats = await fse.stat(src);
        const dstStats = await fse.stat(dst);

        // if the file is already in the target location, prompt the user to confirm the move
        // TODO: could also add option to rename with a number suffix?
        const res = await RendererMessenger.showMessageBox({
          type: 'question',
          title: 'Replace or skip file?',
          message: `"${file.name}" already exists in this folder. Replace or skip?`,
          detail: `From "${path.dirname(file.absolutePath)}" (${humanFileSize(
            srcStats.size,
          )}) \nTo      "${dir}" (${humanFileSize(
            dstStats.size,
          )})\nNote: The tags on the replaced image will be lost.`,
          buttons: ['&Replace', '&Skip', '&Cancel'],
          normalizeAccessKeys: true,
          defaultId: 0,
          cancelId: 2,
          checkboxLabel: matches.length > 1 ? 'Apply to all' : undefined,
        });

        if (res.response === 0 && res.checkboxChecked) {
          isReplaceAllActive = true; // replace all
        } else if ((res.response === 1 && res.checkboxChecked) || res.response === 2) {
          break; // skip all
        } else if (res.response === 1) {
          continue; // skip this file
        }
      }

      // When replacing an existing file, no change is detected when moving the file
      // The target file needs to be removed from disk and the DB first
      if (alreadyExists) {
        // - Remove the target file from disk
        await fse.remove(dst);

        // - Remove the target file from the store
        // TODO: This removes the target file and its tags. Could merge them, but that's a bit more work
        const dstFile = fileStore.fileList.find((f) => f.absolutePath === dst);
        if (dstFile) {
          await fileStore.deleteFiles([dstFile]);
        }

        // - Move the source file to the target path
        // Now the DB and internal state have been prepared to be able to detect the moving of the file
        // Will be done with the move operation below
        // We need to wait a second for the UI to update, otherwise it will cause render issues for some reason (old and new are rendered simultaneously)
        await new Promise((res) => setTimeout(res, 1000));
      } else {
        // Else, the file watcher process will detect the changes and update the File entity accordingly
      }
      await fse.move(src, dst, { overwrite: true });
    }
  }
};

export const useFileDropHandling = (
  expansionId: string,
  fullPath: string,
  expansion: IExpansionState,
  setExpansion: (s: IExpansionState) => void,
) => {
  const { fileStore, locationStore } = useStore();
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
      // Skip events intended for different handlers
      if (!event.dataTransfer.types.includes('Files')) {
        return;
      }
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
          const dropData = await getDropData(event);

          // if this is a local file (it has matches to the files in the DB),
          // it should be moved instead of copied
          const matches = findDroppedFileMatches(dropData, fileStore);
          if (matches) {
            const loc = locationStore.locationList.find((l) => fullPath.startsWith(l.path));
            if (!loc) {
              throw new Error('Location not found for path ' + fullPath);
            }
            await handleMove(fileStore, matches, loc, fullPath);
            setTimeout(() => fileStore.refetch(), 500);
          } else {
            // Otherwise it's an external file (e.g. from the web or a folder not set up as a Location in Allusion)
            // -> download it and "copy" it to the target folder
            await storeDroppedImage(dropData, fullPath);
          }
        } catch (e) {
          console.error(e);
          AppToaster.show({
            message: 'Something went wrong, could not import image :(',
            timeout: 4000,
          });
        }
      } else {
        AppToaster.show({ message: 'File type not supported :(', timeout: 4000 });
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

      // Skip events intended for different handlers
      if (!event.dataTransfer.types.includes('Files')) {
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
