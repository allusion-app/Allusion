import fse from 'fs-extra';
import path from 'path';
import { IMG_EXTENSIONS } from 'src/entities/File';
import { ALLOWED_DROP_TYPES } from 'src/frontend/hooks/useFileDropper';
import { timeoutPromise } from 'src/frontend/utils';
import { IStoreFileMessage } from 'src/Messaging';
import { DnDAttribute } from '../TagsPanel/dnd';

const ALLOWED_FILE_DROP_TYPES = IMG_EXTENSIONS.map((ext) => `image/${ext}`);

export const isAcceptableType = (e: React.DragEvent) => e.dataTransfer?.types.some(type => ALLOWED_DROP_TYPES.includes(type));

/**
 * Executed callback function while dragging over a target.
 *
 * Do not pass an expansive function into the sideEffect parameter. The dragOver
 * event is fired constantly unlike dragEnter which is only fired once.
 */
export function onDragOver(
  event: React.DragEvent<HTMLDivElement>
): boolean {
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

export function handleDragLeave(event: React.DragEvent<HTMLDivElement>) {
  const isFile = isAcceptableType(event);
  if (isFile) {
    event.dataTransfer.dropEffect = 'none';
    event.preventDefault();
    event.stopPropagation();
    event.currentTarget.dataset[DnDAttribute.Target] = 'false';
  }
}

export async function storeDroppedImage(e: React.DragEvent, storagePath: string) {
  e.persist();
  const dropData = await getDropData(e);
  for (const dataItem of dropData) {
    let fileData: IStoreFileMessage | undefined;

    // Store file -> detected by watching the directory -> automatically imported
    if (dataItem instanceof File) {
      const file = await fse.readFile(dataItem.path);
      fileData = {
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
      fileData = { imgBase64, filenameWithExt };
    }
    if (fileData) {
      const { imgBase64, filenameWithExt } = fileData;

      // New approach: Just store it
      const outPath = path.join(storagePath, filenameWithExt);
      const rawData = imgBase64.substr(imgBase64.indexOf(',') + 1); // remove base64 header
      await fse.writeFile(outPath, rawData, 'base64');

      // Old approach: Send base64 file to main process, get back filename where it is stored
      // So it can be tagged immediately
      // const reply = await RendererMessenger.storeFile({ filenameWithExt, imgBase64 });

      // let rejected = false;
      // const timeout = setTimeout(() => {
      //   rejected = true;
      //   console.error('Could not store dropped image in backend');
      // }, 5000);

      // if (!rejected) {
      //   clearTimeout(timeout);
      //   console.log('Imported file', reply.downloadPath);

      //   // Add tag if needed
      //   // if (tag !== undefined) {
      //   //   const file = await fileStore.importExternalFile(reply.downloadPath, new Date());
      //   //   file.addTag(tag);
      //   // }
      // }
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
