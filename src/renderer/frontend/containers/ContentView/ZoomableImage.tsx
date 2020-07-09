import React, { useRef, useState, useCallback, useEffect } from 'react';
import { Rectangle } from 'electron';

import PinchZoomPan from 'react-responsive-pinch-zoom-pan';
import { observer } from 'mobx-react-lite';
import IconSet from 'components/Icons';
import { Icon } from '@blueprintjs/core';

interface IZoomableImageProps {
  src: string;
  contentRect: Rectangle;
  prevImage?: () => any;
  nextImage?: () => any;
}

const ZoomableImage = ({ src, contentRect, prevImage, nextImage }: IZoomableImageProps) => {
  const ignoreClick = useCallback((e: React.MouseEvent) => e.stopPropagation(), []);

  // Todo: Same context menu as GalleryItem
  return (
    <div onClick={ignoreClick} id="zoomableImage">
      <div
        style={{
          width: `${contentRect.width}px`,
          height: `${contentRect.height}px`,
        }}
      >
        {/* https://github.com/bradstiff/react-responsive-pinch-zoom-pan */}
        <PinchZoomPan
          position="center"
          zoomButtons={false}
          maxScale={4}
          key={src}
          doubleTapBehavior="zoom"
        >
          <img src={src} alt={src} />
        </PinchZoomPan>

        {/* Overlay buttons/icons */}
        {prevImage && (
          <div className="sideButton" onClick={prevImage}>
            <Icon icon={IconSet.ARROW_LEFT} iconSize={48} />
          </div>
        )}
        {nextImage && (
          <div className="sideButton" onClick={nextImage} style={{ right: 0 }}>
            <Icon icon={IconSet.ARROW_RIGHT} iconSize={48} />
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Not used anymore. Tried creating custom component for full control but had some difficulty with supporting
 * all combinations of image sizes and aspect ratios. Could retry later on.
 */
export const CustomZoomableImage = ({ src, contentRect }: IZoomableImageProps) => {
  const imageEl = useRef<HTMLImageElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [dragStart, setDragStart] = useState([0, 0]); // Client coordinates where drag starts
  const [baseOffset, setBaseOffset] = useState([0, 0]); // UV coordinates on image [0, 1]
  const [deltaOffset, setDeltaOffset] = useState([0, 0]); // Change in translation from panning [0, 1]

  const isZooming = zoomLevel !== 1;
  const offset = [baseOffset[0] + deltaOffset[0], baseOffset[1] + deltaOffset[1]];

  // const clamp = useCallback((offs: number) => {

  // }, []);

  const clampOffset = useCallback(
    (offs: number[]) => {
      const MAX_PAN = 0.5;
      let [dX, dY] = offs;

      // Find how to adjust the maximum pan extent for the image resolution in the container
      const viewRatio = [1, 1];
      if (imageEl.current) {
        const aspect =
          imageEl.current.naturalWidth /
          imageEl.current.naturalHeight /
          (contentRect.width / contentRect.height);
        if (aspect > 1) {
          viewRatio[1] = 1 / aspect;
        } else {
          viewRatio[0] = aspect;
        }
      }

      // const inDy = dY;

      // Clamp offset: Ensure image can't be panned outside of the view
      const maxPanX = MAX_PAN * viewRatio[0] - 1 / (2 * zoomLevel);
      if (Math.abs(baseOffset[0] + dX) > maxPanX) {
        dX = (maxPanX - Math.abs(baseOffset[0])) * Math.sign(baseOffset[0] + dX);
      }
      const maxPanY = MAX_PAN * viewRatio[1] - 1 / (2 * zoomLevel);
      if (Math.abs(baseOffset[1] + dY) > maxPanY) {
        dY = (maxPanY - Math.abs(baseOffset[1])) * Math.sign(baseOffset[1] + dY);
      }

      // console.log('In dY ', inDy.toFixed(3), 'out dY: ', dY.toFixed(3), 'base offset y', baseOffset[1].toFixed(3), 'max', maxPanY.toFixed(3), 'sign', Math.sign(baseOffset[1] + dY));
      // console.log(Math.sign(baseOffset[1] + dY), maxPanY, baseOffset[1], dY);

      // Keep image centered until it goes beyond the border of the container
      if (contentRect.width * viewRatio[0] * zoomLevel < contentRect.width) {
        dX = 0;
      }
      if (contentRect.height * viewRatio[1] * zoomLevel < contentRect.height) {
        dY = 0;
      }
      return [dX, dY];
    },
    [baseOffset, contentRect, zoomLevel],
  );

  const panToCursor = useCallback(
    (e: React.MouseEvent) => {
      const newDeltaOffset = clampOffset([
        (e.clientX - dragStart[0]) / contentRect.width / zoomLevel,
        (e.clientY - dragStart[1]) / contentRect.height / zoomLevel,
      ]);
      setDeltaOffset(newDeltaOffset);
    },
    [setDeltaOffset, zoomLevel, dragStart, contentRect, clampOffset],
  );

  const stopZooming = useCallback(() => {
    setZoomLevel(1);
    setBaseOffset([0, 0]);
    setDeltaOffset([0, 0]);
    setIsDragging(false);
  }, [setZoomLevel, setBaseOffset, setDeltaOffset, setIsDragging]);

  const handleEscape = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        stopZooming();
      }
    },
    [stopZooming],
  );

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      const ZOOM_SPEED = 0.2;
      const MIN_ZOOM = 1;
      let MAX_ZOOM = 1;
      if (imageEl.current) {
        // Make max zoom depend on image resolution
        MAX_ZOOM *= Math.max(
          imageEl.current.naturalWidth / contentRect.width,
          imageEl.current.naturalHeight / contentRect.height,
        );
      }

      if (e.ctrlKey || e.buttons === 1) {
        const newZoom = Math.min(
          MAX_ZOOM,
          Math.max(MIN_ZOOM, (1 - Math.sign(e.deltaY) * ZOOM_SPEED) * zoomLevel),
        );
        setZoomLevel(newZoom);

        // Zoom in direction of cursor
        const dZoom = newZoom - zoomLevel;
        const zoomFact = dZoom / (newZoom * newZoom);
        const [dX, dY] = clampOffset([
          (0.5 - (e.clientX - contentRect.x) / contentRect.width) * zoomFact,
          (0.5 - (e.clientY - contentRect.y) / contentRect.height) * zoomFact,
        ]);
        setBaseOffset([baseOffset[0] + dX, baseOffset[1] + dY]);

        // reset offsets etc. when manually zooming out
        if (newZoom === MIN_ZOOM) {
          stopZooming();
        }
      }
      // Stop scroll event when zooming left click is still pressed
      if (isZooming || e.buttons === 1) {
        e.stopPropagation();
      }
    },
    [zoomLevel, setZoomLevel, contentRect, isZooming, baseOffset, clampOffset, stopZooming],
  );

  // Stop zooming when a new image is loaded
  useEffect(() => stopZooming(), [src, stopZooming]);

  // Zoom in with double click
  const DBL_CLICK_ZOOM = 2;
  const handleDbClick = useCallback(
    (e: React.MouseEvent) => {
      if (isZooming) {
        stopZooming();
      } else {
        setZoomLevel(DBL_CLICK_ZOOM);
        const initOffset = [
          (0.5 - (e.clientX - contentRect.x) / contentRect.width) * zoomLevel,
          (0.5 - (e.clientY - contentRect.y) / contentRect.height) * zoomLevel,
        ];
        setBaseOffset(initOffset); // todo: zoom into click position, without going out of bounds
      }
    },
    [isZooming, stopZooming, setZoomLevel, contentRect, zoomLevel],
  );

  // Block native drag event when zooming
  const handleDragStart = useCallback(
    (e: React.DragEvent) => {
      if (isZooming) {
        e.preventDefault();
        return false;
      }
      return true;
    },
    [isZooming],
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (isDragging) {
        panToCursor(e);
      }
    },
    [panToCursor, isDragging],
  );

  const handleMouseDown = useCallback(
    (e: React.MouseEvent) => {
      if (isZooming) {
        setIsDragging(true);
        setDragStart([e.clientX, e.clientY]);
      }
    },
    [isZooming, setIsDragging, setDragStart],
  );

  const handleMouseUp = useCallback(() => {
    if (isZooming) {
      setBaseOffset(offset);
      setIsDragging(false);
      setDeltaOffset([0, 0]);
    }
  }, [isZooming, offset]);

  const ignoreClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
  }, []);

  // console.log(offset, zoomLevel);

  return (
    <div
      id="zoomableSlideImage"
      onClick={ignoreClick}
      onDoubleClick={handleDbClick}
      onDragStart={handleDragStart}
      onMouseMove={handleMouseMove}
      onMouseDown={handleMouseDown}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onKeyDown={handleEscape}
      onWheel={handleWheel}
      tabIndex={0}
    >
      <img
        ref={imageEl}
        style={{
          transform: isZooming
            ? `scale(${zoomLevel}) translate(${offset[0] * 100}%, ${offset[1] * 100}%)`
            : '',
        }}
        className={isDragging ? '' : 'no-drag'}
        src={src}
      />
    </div>
  );
};

export default observer(ZoomableImage);
