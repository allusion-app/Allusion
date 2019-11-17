import React, { useRef, useState, useCallback, useEffect } from 'react';

import { ClientFile } from '../../entities/File';

interface IDimensions {
  width: number;
  height: number;
}

function getFitDimensions(natDim: IDimensions): IDimensions {
  let width = natDim.width;
  let height = natDim.height;

  if (width > window.innerWidth) {
    width = window.innerWidth;
    height = natDim.height * window.innerWidth / natDim.width;
  }
  if (height > window.innerHeight) {
    height = window.innerHeight;
    width = natDim.width * window.innerHeight / natDim.height;
  }
  return { width, height };
}

function checkIfZoomable(dim: IDimensions) {
  return dim.width > window.innerWidth || dim.height > window.innerHeight;
}

interface IImageViewerProps {
  file: ClientFile;
  onClose: () => void;
}

const ImageViewer = ({ file, onClose }: IImageViewerProps) => {
  const imageEl = useRef<HTMLImageElement>(null);
  const [naturalDimensions, setNaturalDimensions] = useState<IDimensions>({ width: 0, height: 0 });

  // Image props
  useEffect(() => {
    if (imageEl.current) {
      setNaturalDimensions({
        width: imageEl.current.naturalWidth,
        height: imageEl.current.naturalHeight,
      });
    }
  }, []);

  const isZoomable = imageEl.current && checkIfZoomable(naturalDimensions);
  const viewDimensions = isZoomable ? getFitDimensions(naturalDimensions) : naturalDimensions;

  const [isZooming, setZooming] = useState(false);
  const [transform, setTransform] = useState('');

  // Event handlers
  const zoomToCursor = useCallback((e: React.MouseEvent) => {
    const clientWidth = document.body.clientWidth; // without scrollbar
    const clientHeight = window.innerHeight;       // absolute window height
    const { width: natWidth, height: natHeight } = naturalDimensions;

    const zoomOffsetWidth =  (natWidth - clientWidth) / natWidth * 100;
    const zoomOffsetHeight = (natHeight - clientHeight) / natHeight * 100;

    let width = -50;
    let height = -50;
    if (natWidth > clientWidth) {   width  -= (e.clientX / clientWidth  - 0.5) * zoomOffsetWidth; }
    if (natHeight > clientHeight) { height -= (e.clientY / clientHeight - 0.5) * zoomOffsetHeight; }

    setTransform('translate(' + width + '%, ' + height + '%)');
  }, [naturalDimensions]);

  const toggleZooming = (e: React.MouseEvent) => {
    e.stopPropagation();
    setZooming(!isZooming);
    if (!isZooming) {
      zoomToCursor(e);
    }
  };

  const hideOnEscape = useCallback((e: KeyboardEvent) => e.keyCode === 27 && onClose(), [onClose]);

  useEffect(() => {
    document.addEventListener('keydown', hideOnEscape);
    return function cleanup() {
      document.removeEventListener('keydown', hideOnEscape);
    };
  });

  return (
    <div id="imageViewer" onClick={onClose}>
      <img
        ref={imageEl}
        id="fullImage"
        className={isZoomable ? `${isZooming ? 'zoomOut' : 'zoomIn'}` : ''}
        src={file.path}
        width={isZooming ? naturalDimensions.width : viewDimensions.width}
        height={isZooming ? naturalDimensions.height : viewDimensions.height}
        onClick={toggleZooming}
        onMouseMove={isZooming ? zoomToCursor : undefined}
        style={{ transform: isZooming ? transform : '' }}
        // onLoad={() => imageUrl === imageData.url
        //   // Force update to process new properties from changed ref
        //   && forceUpdate(Math.random())}
      />
    </div>
  );
};

export default ImageViewer;
