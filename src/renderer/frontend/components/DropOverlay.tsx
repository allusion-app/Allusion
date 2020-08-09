import React, { useState, useCallback, useContext } from 'react';
import { Card, Overlay, H4, Tag } from '@blueprintjs/core';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';
import fse from 'fs-extra';
import path from 'path';

import { ClientTag } from '../../entities/Tag';
import { timeoutPromise } from '../utils';
import { IMG_EXTENSIONS } from '../../entities/File';
import { RendererMessenger, IStoreFileMessage } from '../../../Messaging';
import { DEFAULT_LOCATION_ID } from '../../entities/Location';

const ALLOWED_DROP_TYPES = ['Files', 'text/html', 'text/plain'];
const ALLOWED_FILE_DROP_TYPES = IMG_EXTENSIONS.map((ext) => `image/${ext}`);

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

interface IQuickTagProps {
  tag: ClientTag;
  onDropOnTag: (e: React.DragEvent, tag?: ClientTag) => void;
}
const QuickTag = ({ tag, onDropOnTag }: IQuickTagProps) => {
  const handleDropOnTag = useCallback((e: React.DragEvent) => onDropOnTag(e, tag), [
    onDropOnTag,
    tag,
  ]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const handleDragOver = useCallback(() => setIsDraggingOver(true), []);
  const handleDragLeave = useCallback(() => setIsDraggingOver(false), []);

  return (
    <Tag
      onDrop={handleDropOnTag}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      intent={isDraggingOver ? 'primary' : 'none'}
      minimal
      className="tag-drag-drop"
    >
      {tag.name}
    </Tag>
  );
};

/**
 * Adds a div surrounding this component's children, that detects when files/urls are dropped onto it,
 * for easy importing
 */
const DropOverlay = ({ children }: { children: React.ReactChild | React.ReactChild[] }) => {
  const { tagStore, fileStore } = useContext(StoreContext);

  const [isDropping, setIsDropping] = useState<boolean>(false);

  const [checkedDrop, setCheckedDrop] = useState(false);

  const handleDropStart = useCallback(
    async (e: React.DragEvent) => {
      // We only have to check once, until drag leave
      if (checkedDrop) return;
      setCheckedDrop(true);

      e.dataTransfer.dropEffect = 'copy';
      let allowDrop = e.dataTransfer.types.some((t) => ALLOWED_DROP_TYPES.includes(t));

      // Detect whether the drag event came from within Allusion
      // FIXME: Yes, this is hacky. But... The native drag event does not allow you to specify any metadata, just a list of files...
      const w = window as any;
      const isInternalEvent =
        w.internalDragStart &&
        new Date().getTime() - (w.internalDragStart as Date)?.getTime() < 300;

      // Don't show drop overlay when dragging an image from inside of allusion
      if (e.dataTransfer.types.includes('text/allusion-ignore') || isInternalEvent) {
        e.dataTransfer.dropEffect = 'none';
        allowDrop = false;
      } else if (e.dataTransfer.types.includes('Files')) {
        e.dataTransfer.dropEffect = 'link';
        allowDrop = false;
        for (let i = 0; i < e.dataTransfer.items.length; i++) {
          const f = e.dataTransfer.items[i];
          if (f && ALLOWED_FILE_DROP_TYPES.includes(f.type)) {
            allowDrop = true;
            break;
          }
        }
      }
      e.preventDefault();
      if (isDropping !== allowDrop) {
        setIsDropping(allowDrop);
      }
    },
    [isDropping, checkedDrop],
  );

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if dragging outside itself or its children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDropping(false);
      setCheckedDrop(false);
    }
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent, tag?: ClientTag) => {
      e.preventDefault();
      e.stopPropagation();

      const dropData = await getDropData(e);
      try {
        for (const dataItem of dropData) {
          let fileData: IStoreFileMessage | undefined;

          // Copy file into the default import location
          // Reusing the same code for importing through the web extension
          // Store file -> detected by watching the directory -> import
          if (dataItem instanceof File) {
            const file = await fse.readFile(dataItem.path);
            fileData = {
              filenameWithExt: path.basename(dataItem.path),
              imgBase64: new Buffer(file).toString('base64'),
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

            let rejected = false;
            const timeout = setTimeout(() => {
              rejected = true;
              console.error('Could not store dropped image in backend');
            }, 5000);

            // Send base64 file to main process, get back filename where it is stored
            const reply = await RendererMessenger.storeFile({ filenameWithExt, imgBase64 });

            if (!rejected) {
              clearTimeout(timeout);
              console.log('Imported file', reply.downloadPath);

              // Add tag if needed
              const clientFile = await fileStore.addFile(reply.downloadPath, DEFAULT_LOCATION_ID);
              if (clientFile && tag) {
                clientFile.addTag(tag.id);
              }
            }
          }
        }
      } catch (e) {
        console.log('Error while importing dropped file:', e);
      } finally {
        setIsDropping(false);
        setCheckedDrop(false);
      }
    },
    [fileStore],
  );

  return (
    <div onDragEnter={handleDropStart}>
      {children}
      {/* TODO: Blue-ish backdrop */}
      <Overlay isOpen={isDropping} canEscapeKeyClose={false}>
        <div
          onDragLeave={handleDragLeave}
          onDragExit={handleDragLeave}
          style={{ width: '100%', height: '100%' }}
          onDrop={handleDrop}
        >
          <Card
            elevation={4}
            className="drop-overlay-content"
            // todo: blue background when dropping over
          >
            <H4 className="bp3-heading inpectorHeading">Drop import</H4>
            <p>Drag onto a tag to immediately tag it or anywhere to import it untagged</p>

            {/* <H4 className="bp3-heading inpectorHeading">Drop anywhere to import</H4>
            <p>Or drag onto a tag to immediately tag it</p> */}

            {/* TODO: Sort by frequency, or alphabetically? */}
            <div className="quick-tags">
              {tagStore.tagList.map((tag) => (
                <QuickTag tag={tag} onDropOnTag={handleDrop} key={tag.id} />
              ))}
            </div>
          </Card>
        </div>
      </Overlay>
    </div>
  );
};

export default observer(DropOverlay);
