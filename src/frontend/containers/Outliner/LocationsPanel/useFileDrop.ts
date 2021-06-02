import fse from 'fs-extra';
import path from 'path';
import { IMG_EXTENSIONS } from 'src/entities/File';
import { ALLOWED_DROP_TYPES } from 'src/frontend/containers/Outliner/LocationsPanel/useFileDropper';
import { timeoutPromise } from 'src/frontend/utils';
import { IStoreFileMessage, RendererMessenger } from 'src/Messaging';
import { DnDAttribute } from 'src/frontend/contexts/TagDnDContext';
import { useCallback, useRef } from 'react';
import { HOVER_TIME_TO_EXPAND } from '..';
import { AppToaster } from 'src/frontend/components/Toaster';
import { useLocationsTreeState } from './LocationsTreeState';

export function useFileDrop(expansionId: string, fullPath: string) {
  const state = useLocationsTreeState();
  // Don't expand immediately, only after hovering over it for a second or so
  const expandTimeoutId = useRef<number>();

  const handleDragEnter = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.stopPropagation();
      event.preventDefault();
      const canDrop = onDragOver(event);
      if (canDrop && !state.isExpanded(expansionId)) {
        clearTimeout(expandTimeoutId.current);
        expandTimeoutId.current = window.setTimeout(
          () => state.toggleExpansion(expansionId),
          HOVER_TIME_TO_EXPAND,
        );
      }
    },
    [state, expansionId],
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

  const handleDragLeaveWrapper = useRef((event: React.DragEvent<HTMLDivElement>) => {
    // Drag events are also triggered for children??
    // We don't want to detect dragLeave of a child as a dragLeave of the target element, so return immmediately
    if ((event.target as HTMLElement).contains(event.relatedTarget as HTMLElement)) {
      return;
    }

    event.stopPropagation();
    event.preventDefault();
    handleDragLeave(event);

    clearTimeout(expandTimeoutId.current);
    expandTimeoutId.current = undefined;
  }).current;

  return {
    handleDragEnter,
    handleDrop,
    handleDragLeave: handleDragLeaveWrapper,
  };
}

const ALLOWED_FILE_DROP_TYPES = IMG_EXTENSIONS.map((ext) => `image/${ext}`);

const isAcceptableType = (e: React.DragEvent) =>
  e.dataTransfer?.types.some((type) => ALLOWED_DROP_TYPES.includes(type));

/**
 * Executed callback function while dragging over a target.
 *
 * Do not pass an expansive function into the sideEffect parameter. The dragOver
 * event is fired constantly unlike dragEnter which is only fired once.
 */
export function onDragOver(event: React.DragEvent<HTMLDivElement>): boolean {
  const dropTarget = event.currentTarget;

  const isFile = isAcceptableType(event);
  if (isFile) {
    event.dataTransfer.dropEffect = 'copy';
    event.preventDefault();
    event.stopPropagation();
    dropTarget.dataset[DnDAttribute.Target] = 'true';
    return true;
  }
  return false;
}

function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
  const isFile = isAcceptableType(event);
  if (isFile) {
    event.dataTransfer.dropEffect = 'none';
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }
}

async function storeDroppedImage(e: React.DragEvent, directory: string) {
  e.persist();
  const dropData = await getDropData(e);
  for (const dataItem of dropData) {
    let fileData: IStoreFileMessage | undefined;

    // Store file -> detected by watching the directory -> automatically imported
    if (dataItem instanceof File) {
      const file = await fse.readFile(dataItem.path);
      fileData = {
        directory,
        filenameWithExt: path.basename(dataItem.path),
        imgBase64: file.toString('base64'),
      };
    } else if (typeof dataItem === 'string') {
      // It's probably a URL, so we can download it to get the image data
      const { imgBase64, blob } = await imageAsBase64(dataItem);
      const extension = blob.type.split('/')[1];
      const filename = getFilenameFromUrl(dataItem, 'image');
      const filenameWithExt = IMG_EXTENSIONS.some((ext) => filename.endsWith(ext))
        ? filename
        : `${filename}.${extension}`;
      fileData = { directory, imgBase64, filenameWithExt };
    }
    if (fileData) {
      const { imgBase64, filenameWithExt } = fileData;

      // Send base64 file to main process, get back filename where it is stored
      // So it can be tagged immediately
      // Filename will be incremented if file already exists, e.g. `image.jpg -> image 1.jpg`
      const reply = await RendererMessenger.storeFile({ directory, filenameWithExt, imgBase64 });

      let rejected = false;
      const timeout = setTimeout(() => {
        rejected = true;
        console.error('Could not store dropped image in backend');
      }, 5000);

      if (!rejected) {
        clearTimeout(timeout);
        console.log('Imported file', reply.downloadPath);
      }
    }
  }
}

/** Tests whether a URL points to an image */
async function testImage(url: string, timeout: number = 2000): Promise<boolean> {
  try {
    const blob = await timeoutPromise(timeout, fetch(url));
    return IMG_EXTENSIONS.some((ext) => blob.type.endsWith(ext));
  } catch (e) {
    return false;
  }
}

function imageAsBase64(url: string): Promise<{ imgBase64: string; blob: Blob }> {
  return new Promise(async (resolve, reject) => {
    const response = await fetch(url);
    const blob = await response.blob();
    const reader = new FileReader();

    reader.onerror = reject;
    reader.onload = () =>
      reader.result
        ? resolve({ imgBase64: reader.result.toString(), blob })
        : reject('Could not convert to base64 image');
    reader.readAsDataURL(blob);
  });
}

function getFilenameFromUrl(url: string, fallback: string) {
  if (url.startsWith('data:')) {
    return fallback;
  }
  const pathname = new URL(url).pathname;
  const index = pathname.lastIndexOf('/');
  return index !== -1 ? pathname.substring(index + 1) : pathname;
}

async function getDropData(e: React.DragEvent): Promise<Array<File | string>> {
  // Using a set to filter out duplicates. For some reason, dropping URLs duplicates them 3 times (for me)
  const dropItems = new Set<File | string>();

  // First get all files in the drop event
  if (e.dataTransfer.files.length > 0) {
    // tslint:disable-next-line: prefer-for-of
    for (let i = 0; i < e.dataTransfer.files.length; i++) {
      const file = e.dataTransfer.files[i];
      // Check if file is an image
      if (file && ALLOWED_FILE_DROP_TYPES.includes(file.type)) {
        dropItems.add(file);
      }
    }
  }

  if (e.dataTransfer.types.includes('text/html')) {
    const droppedHtml = e.dataTransfer.getData('text/html');
    const container = document.createElement('html');
    container.innerHTML = droppedHtml;
    const imgs = container.getElementsByTagName('img');
    if (imgs.length === 1) {
      const src = imgs[0].src;
      dropItems.add(src);
    }
  } else if (e.dataTransfer.types.includes('text/plain')) {
    const plainText = e.dataTransfer.getData('text/plain');
    // Check if text is an URL
    if (/^https?:\/\//i.test(plainText)) {
      dropItems.add(plainText);
    }
  }

  // Filter out URLs that are not an image
  const imageItems = await Promise.all(
    Array.from(dropItems).filter((item) => {
      if (item instanceof File) {
        return true;
      } else {
        // Check if the URL has an image extension, or perform a network request
        if (IMG_EXTENSIONS.some((ext) => item.toLowerCase().indexOf(`.${ext}`) !== -1)) {
          return true;
        } else {
          return testImage(item);
        }
      }
    }),
  );

  return imageItems;
}
