import React, { useCallback, useRef, useState } from 'react';
import { ClientFile } from 'src/renderer/entities/File';
import { ITransform } from './masonry.worker';

interface IRendererProps {
  containerHeight: number;
  containerWidth: number;
  images: ClientFile[];
  getTransform: (index: number) => ITransform;
}

function binarySearch(height: number, length: number, getTransform: (index: number) => ITransform, overshoot: boolean): number {
  let iteration = 1;
  let nextLookup = Math.round(length / 2);
  while (true) {
    iteration++;
    const stepSize = Math.round(length / Math.pow(2, iteration));
    if (stepSize <= 1) return nextLookup;
    const t = getTransform(nextLookup);
    if (t.top > height) {
      if (t.top + t.height > height) { // looked up too far, go back:
        nextLookup -= stepSize;
      } else { // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      }
    } else {
      if (t.top + t.height > height) { // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      } else {
        nextLookup -= stepSize;
      }
    }
  }
}

const Renderer = ({ containerHeight, containerWidth, images, getTransform }: IRendererProps) => {

  const wrapperRef = useRef<HTMLDivElement>(null);
  // TODO: Keep track of viewport
  // only render visible items
  // over-draw option
  // could do a binary search through the image list

  const [startRenderIndex, setStartRenderIndex] = useState(0);
  const [endRenderIndex, setEndRenderIndex] = useState(0);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const wrapper = e.target as HTMLDivElement;
    const yOffset = wrapper.scrollTop;
    const viewportHeight = wrapper.clientHeight;
    // render elements within viewport
    setStartRenderIndex(binarySearch(yOffset, images.length, getTransform, false))
    setEndRenderIndex(binarySearch(yOffset + viewportHeight, images.length, getTransform, true))
  }, [getTransform, images.length]);

  return (
    <div style={{ width: containerWidth, height: containerHeight }} ref={wrapperRef} onScroll={handleScroll}>
      {images.slice(startRenderIndex, endRenderIndex).map((im, index) => (
        <img
          key={im.id}
          src={im.thumbnailPath}
          alt={im.id}
          style={getTransform(index)} // todo: memo?
        />
      ))}
    </div>
  )
}

export default Renderer;
