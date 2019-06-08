import React, { useState, useCallback, useContext } from 'react';
import { Card, Overlay, H5, Tag } from '@blueprintjs/core';
import StoreContext from '../contexts/StoreContext';
import { observer } from 'mobx-react-lite';

import { imgExtensions } from './ImportForm';

function getDropData(e: React.DragEvent): Array<File | string> | null {
  const res = [];
  // tslint:disable-next-line: prefer-for-of
  for (let i = 0; i < e.dataTransfer.items.length; i++) {
    // If dropped items aren't files, reject them
    if (e.dataTransfer.items[i].kind === 'file') {
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
  return res.length > 0 ? res : null;
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
    if (!isDropping && getDropData(e)) {
      setIsDropping(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    // Only trigger if dragging outside itself or its children
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDropping(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDropping(false);

    const data = getDropData(e);
    if (data) {
     data.forEach((f) => {
       if (f instanceof File) {
         fileStore.addFile(f.path);
       } else if (typeof f === 'string') {
         // Todo: Download image from url
       }
     });
   }
  }, []);

  return (
    <div
      onDragOver={handleDropStart}
      onDrop={handleDrop}
    >
      {children}
      <Overlay
        isOpen={isDropping}
        canEscapeKeyClose={false}
      >
        <div
          onDragLeave={handleDragLeave}
          style={{ width: '100%', height: '100%' }}
        >
          <Card
            elevation={4}
            className="drop-overlay-content"
          >
            <H5>Drop anywhere to import</H5>
            <p>Or drag onto a tag to immediately tag it</p>

            {/* TODO: Sort by frequenc, or alphabetically? */}
            {/* Todo: Detect drop of tag */}
            {tagStore.tagList.map((tag) => <Tag key={tag.id}>{tag.name}</Tag>)}
          </Card>
        </div>
      </Overlay>
    </div>
  );
};

export default observer(DropOverlay);
