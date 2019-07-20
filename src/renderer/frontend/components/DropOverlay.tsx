import React, { useState, useCallback, useContext } from 'react';
import { Card, Overlay, H5, Tag } from '@blueprintjs/core';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';

import { imgExtensions } from './ImportForm';
import { ClientTag } from '../../entities/Tag';

// Todo: Added this since sometimes getDropData doesn't work: getAsFile doesn't return a file
// Shouldn't be necessary though...
function hasDropData(e: React.DragEvent): boolean {
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < e.dataTransfer.items.length; i++) {
    if (e.dataTransfer.items[i].kind === 'file') {
      return true;
    } else if (e.dataTransfer.items[i].kind === 'text' || e.dataTransfer.items[i].kind === 'string') {
      return true;
    }
  }
  return false;
}

function getDropData(e: React.DragEvent): Array<File | string> | null {
  const res = [];
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < e.dataTransfer.items.length; i++) {
    // If dropped items aren't files, reject them
    if (e.dataTransfer.items[i].kind === 'file') {
      console.log(e.dataTransfer.items[i]);
      const file = e.dataTransfer.items[i].getAsFile() as File;
      // check if file is an image
      if (file && file.name
        && imgExtensions.some((ext) => file.name.toLowerCase().endsWith(ext))) {
        res.push(file);
      }
    } else if (e.dataTransfer.items[i].kind === 'text' || e.dataTransfer.items[i].kind === 'string') {
      const data = e.dataTransfer.getData('text/plain');
      // Todo: Sometimes there are duplicates entries, filter those out
      if (/^https?:\/\//i.test(data)) { // Check if text is an URL
        res.push(data); // Todo: check if image
      }
    }
  }
  console.log(res);
  return res.length > 0 ? res : null;
}

interface IQuickTagProps {
  tag: ClientTag;
  onDropOnTag: (e: React.DragEvent, tag?: ClientTag) => void;
}
const QuickTag = ({ tag, onDropOnTag }: IQuickTagProps) => {
  const handleDropOnTag = useCallback((e: React.DragEvent) => onDropOnTag(e, tag), [tag]);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const handleDragOver = useCallback(() => setIsDraggingOver(true), []);
  const handleDragLeave = useCallback(() => setIsDraggingOver(false), []);

  return (
    <Tag
      onDrop={handleDropOnTag}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      intent={isDraggingOver ? 'primary' : 'none'}
      large
    >
      {tag.name}
    </Tag>
  );
}

/**
 * Adds a div surrounding this component's children, that detects when files/urls are dropped onto it,
 * for easy importing
 */
const DropOverlay = ({ children }: { children: React.ReactChild | React.ReactChild[] }) => {
  const { tagStore, fileStore } = useContext(StoreContext);

  const [isDropping, setIsDropping] = useState(false);

  const handleDropStart = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    if (!isDropping && hasDropData(e)) {
      setIsDropping(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if dragging outside itself or its children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDropping(false);
    }
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent, tag?: ClientTag) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDropping(false);

    const data = getDropData(e);
    if (data) {
      for (const dataItem of data) {
        if (dataItem instanceof File) {
          const file = await fileStore.addFile(dataItem.path);
          if (tag) {
            file.addTag(tag.id);
          }
        } else if (typeof dataItem === 'string') {
          // Todo: Download image from url
        }
      }
    }
  }, []);

  return (
    <div
      onDragOver={handleDropStart}
    >
      {children}
      <Overlay
        isOpen={isDropping}
        canEscapeKeyClose={false}
      >
        <div
          onDragLeave={handleDragLeave}
          style={{ width: '100%', height: '100%' }}
          onDrop={handleDrop}
        >
          <Card
            elevation={4}
            className="drop-overlay-content"
            // todo: blue background when dropping over
          >
            <H5>Drop anywhere to import</H5>
            <p>Or drag onto a tag to immediately tag it</p>

            {/* TODO: Sort by frequenc, or alphabetically? */}
            <div className="quick-tags">
              {tagStore.tagList.map((tag) =>
                <QuickTag tag={tag} onDropOnTag={handleDrop} key={tag.id} />,
              )}
            </div>
          </Card>
        </div>
      </Overlay>
    </div>
  );
};

export default observer(DropOverlay);
