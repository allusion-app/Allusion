import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ClientFile } from 'src/renderer/entities/File';
import { ILayout, ITransform } from './masonry.worker';

interface Layouter {
  getItemLayout: (index: number) => ITransform;
}

interface IRendererProps {
  containerHeight: number;
  containerWidth: number;
  images: ClientFile[];
  layout: Layouter;
  className?: string;
}

// function binarySearch(height: number, length: number, layout: ILayout, overshoot: boolean): number {
//   let iteration = 1;
//   let nextLookup = Math.round(length / 2);
//   while (true) {
//     iteration++;
//     const stepSize = Math.round(length / Math.pow(2, iteration));
//     if (stepSize <= 1) return nextLookup;
//     const t = layout.items[nextLookup];
//     if (t.top > height) {
//       if (t.top + t.height > height) { // looked up too far, go back:
//         nextLookup -= stepSize;
//       } else { // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
//         return nextLookup;
//       }
//     } else {
//       if (t.top + t.height > height) { // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
//         return nextLookup;
//       } else {
//         nextLookup -= stepSize;
//       }
//     }
//   }
// }

const Renderer = observer(({ containerHeight, containerWidth, images, layout, className }: IRendererProps) => {

  const wrapperRef = useRef<HTMLDivElement>(null);
  // TODO: Keep track of viewport
  // only render visible items
  // over-draw option
  // could do a binary search through the image list

  const [startRenderIndex, setStartRenderIndex] = useState(0);
  const [endRenderIndex, setEndRenderIndex] = useState(0);

  useEffect(() => {
    if (!wrapperRef.current) return;
    const scrollListener = console.log;
    wrapperRef.current.addEventListener('scroll', scrollListener, true);
    return () => wrapperRef.current?.removeEventListener('scroll', scrollListener);
  }, []);

  useEffect(() => {
    const yOffset = wrapperRef.current?.scrollTop || 0;
    const viewportHeight = wrapperRef.current?.clientHeight || 0;
    setEndRenderIndex(images.length); // TODO: Only show what's in viewport at start
    // setEndRenderIndex(binarySearch(yOffset + viewportHeight, images.length, layout, true));
  }, [images.length]);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const wrapper = e.target as HTMLDivElement;
    const yOffset = wrapper.scrollTop;
    const viewportHeight = wrapper.clientHeight;
    // render elements within viewport
    // setStartRenderIndex(binarySearch(yOffset, images.length, layout, false))
    // setEndRenderIndex(binarySearch(yOffset + viewportHeight, images.length, layout, true))
    setEndRenderIndex(images.length);
  }, [images.length]);

  // console.log({ startRenderIndex, endRenderIndex, numImgs: images.length });

  return (
    <div className={className} style={{ width: containerWidth, height: containerHeight }} ref={wrapperRef} onScroll={handleScroll}>
      {images.slice(startRenderIndex, endRenderIndex).map((im, index) => (
        <img
          key={im.id}
          src={im.thumbnailPath}
          alt={im.id}
          style={layout.getItemLayout(index)}
        />
      ))}
    </div>
  )
});

export default Renderer;
