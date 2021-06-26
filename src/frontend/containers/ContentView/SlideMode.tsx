import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ZoomPan, { ISlideTransform } from './SlideMode/ZoomPan';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import FileStore from 'src/frontend/stores/FileStore';
import UiStore from 'src/frontend/stores/UiStore';
import { IconSet, Split } from 'widgets';
import Inspector from '../Inspector';
import { GalleryEventHandler, GallerySelector, MissingImageFallback } from './GalleryItem';
import { createSubmitCommand } from './LayoutSwitcher';

interface ISlideMode {
  contentRect: { width: number; height: number };
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
}

const SlideMode = observer((props: ISlideMode) => {
  const { contentRect, showContextMenu } = props;
  const { uiStore, fileStore } = useStore();
  const isInspectorOpen = uiStore.isInspectorOpen;
  const inspectorWidth = uiStore.inspectorWidth;
  const contentWidth = contentRect.width - (isInspectorOpen ? inspectorWidth : 0);
  const contentHeight = contentRect.height;

  const slideView = (
    <SlideView
      uiStore={uiStore}
      fileStore={fileStore}
      showContextMenu={showContextMenu}
      width={contentWidth}
      height={contentHeight}
    />
  );

  return (
    <Split
      id="slide-mode"
      className={uiStore.isSlideMode ? 'fade-in' : 'fade-out'}
      primary={<Inspector />}
      secondary={slideView}
      axis="vertical"
      align="right"
      splitPoint={inspectorWidth}
      isExpanded={isInspectorOpen}
      onMove={uiStore.moveInspectorSplitter}
    />
  );
});

interface ISlideView {
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
  width: number;
  height: number;
  uiStore: UiStore;
  fileStore: FileStore;
}

const SlideView = observer((props: ISlideView) => {
  const { uiStore, fileStore, width, height, showContextMenu } = props;
  const file = fileStore.fileList[uiStore.firstItem];

  const dndData = useTagDnD();
  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, () => null, showContextMenu, uiStore),
    [dndData, showContextMenu, uiStore],
  );
  const handleContextMenu = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      submitCommand({
        selector: GallerySelector.ContextMenuSlide,
        payload: [file, e.clientX, e.clientY],
      });
    },
    [file, submitCommand],
  );

  const eventHandlers = useMemo(
    () => submitCommand && new GalleryEventHandler(file, submitCommand).handlers,
    [file, submitCommand],
  );

  // Go to the first selected image on load
  useEffect(() => {
    runInAction(() => {
      if (uiStore.firstSelectedFile !== undefined) {
        uiStore.setFirstItem(fileStore.getIndex(uiStore.firstSelectedFile.id));
      }
    });
  }, [fileStore, uiStore]);

  // Go back to previous view when pressing the back button (mouse button 5)
  useEffect(() => {
    // Push a dummy state, so that a pop-state event can be activated
    history.pushState(null, document.title, location.href);
    const popStateHandler = uiStore.disableSlideMode;
    window.addEventListener('popstate', popStateHandler);
    return () => window.removeEventListener('popstate', popStateHandler);
  }, [uiStore.disableSlideMode]);

  const decrImgIndex = useCallback(
    () => runInAction(() => uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1))),
    [uiStore],
  );
  const incrImgIndex = useCallback(
    () =>
      runInAction(() =>
        uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileStore.fileList.length - 1)),
      ),
    [uiStore, fileStore.fileList.length],
  );

  // Detect left/right arrow keys to scroll between images
  const handleUserKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        decrImgIndex();
      } else if (event.key === 'ArrowRight') {
        incrImgIndex();
      } else if (event.key === 'Escape' || event.key === 'Backspace') {
        uiStore.disableSlideMode();
      }
    },
    [incrImgIndex, decrImgIndex, uiStore],
  );

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [handleUserKeyPress]);

  // Preload next and previous image for better UX
  useEffect(() => {
    runInAction(() => {
      if (uiStore.firstItem + 1 < fileStore.fileList.length) {
        const nextImg = new Image();
        nextImg.src = fileStore.fileList[uiStore.firstItem + 1].absolutePath;
      }
      if (uiStore.firstItem - 1 >= 0) {
        const prevImg = new Image();
        prevImg.src = fileStore.fileList[uiStore.firstItem - 1].absolutePath;
      }
    });
  }, [fileStore.fileList, uiStore.firstItem]);

  const transitionStart: ISlideTransform | undefined = useMemo(() => {
    const thumbEl = document.querySelector(`[data-file-id="${file.id}"]`);
    const container = document.querySelector('#gallery-content');
    if (thumbEl && container) {
      const thumbElRect = thumbEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        left: thumbElRect.left - containerRect.left,
        top: thumbElRect.top - containerRect.top,
        scale: thumbElRect.height / file.height,
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  return (
    <ZoomableImage
      src={file.absolutePath}
      thumbnailSrc={file.thumbnailPath}
      width={width}
      height={height}
      imgWidth={file.width}
      imgHeight={file.height}
      transitionStart={transitionStart}
      transitionEnd={uiStore.isSlideMode ? undefined : transitionStart}
      prevImage={uiStore.firstItem - 1 >= 0 ? decrImgIndex : undefined}
      nextImage={uiStore.firstItem + 1 < fileStore.fileList.length ? incrImgIndex : undefined}
      onContextMenu={handleContextMenu}
      onDrop={eventHandlers.onDrop}
      onClose={uiStore.disableSlideMode}
      doubleClickBehavior={uiStore.slideModeDoubleClickBehavior}
      tabIndex={-1}
    />
  );
});

interface IZoomableImageProps {
  src: string;
  thumbnailSrc?: string;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
  prevImage?: () => any;
  nextImage?: () => any;
  transitionStart?: ISlideTransform;
  transitionEnd?: ISlideTransform;
  onContextMenu: (e: React.MouseEvent) => void;
  onClose?: () => void;
  doubleClickBehavior?: 'zoomOrReset' | 'close';
}

const ZoomableImage: React.FC<IZoomableImageProps & React.HTMLAttributes<HTMLDivElement>> = ({
  src,
  thumbnailSrc,
  width,
  height,
  imgWidth,
  imgHeight,
  prevImage,
  nextImage,
  transitionStart,
  transitionEnd,
  onContextMenu,
  onClose,
  doubleClickBehavior,
  ...rest
}: IZoomableImageProps) => {
  const [loadError, setLoadError] = useState<any>();
  useEffect(() => setLoadError(undefined), [src]);

  // in order to coordinate image dimensions at the time of loading, store current img src + dimensions together
  const [currentImg, setCurrentImg] = useState({
    src: thumbnailSrc || src,
    dimensions: { width: imgWidth, height: imgHeight },
  });
  useEffect(() => {
    setCurrentImg({
      src: thumbnailSrc || src,
      dimensions: { width: imgWidth, height: imgHeight },
    });
    const img = new Image();
    img.src = src;
    img.onload = () =>
      setCurrentImg((prevImg) =>
        prevImg.src === thumbnailSrc
          ? { src, dimensions: { width: imgWidth, height: imgHeight } }
          : prevImg,
      );
    img.onerror = setLoadError;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, thumbnailSrc]);

  const minScale = Math.min(0.1, Math.min(width / imgWidth, height / imgHeight));

  return (
    <div
      id="zoomable-image"
      style={{
        maxWidth: `${width}px`,
        height: `${height}px`,
      }}
      onContextMenu={onContextMenu}
      {...rest}
    >
      {/* Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan */}
      <ZoomPan
        position="center"
        initialScale="auto"
        doubleTapBehavior={doubleClickBehavior}
        imageDimensions={currentImg.dimensions}
        containerDimensions={{ width, height }}
        minScale={minScale}
        maxScale={5}
        transitionStart={transitionStart}
        transitionEnd={transitionEnd}
        onClose={onClose}
        // debug
      >
        {loadError ? (
          <MissingImageFallback
            style={{
              width: `${width}px`,
              height: `${height}px`,
            }}
          />
        ) : (
          <img
            src={currentImg.src}
            width={currentImg.dimensions.width}
            height={currentImg.dimensions.height}
            alt={`Image could not be loaded: ${src}`}
            onError={setLoadError}
          />
        )}
      </ZoomPan>
      {/* Overlay buttons/icons */}
      {prevImage && (
        <button aria-label="previous image" className="side-button-left" onClick={prevImage}>
          {IconSet.ARROW_LEFT}
        </button>
      )}
      {nextImage && (
        <button aria-label="next image" className="side-button-right" onClick={nextImage}>
          {IconSet.ARROW_RIGHT}
        </button>
      )}
    </div>
  );
};

ZoomableImage.displayName = 'ZoomableImage';
SlideMode.displayName = 'SlideMode';

export default SlideMode;
