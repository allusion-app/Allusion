import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect, useMemo, useState } from 'react';
import ZoomPan from './SlideMode/ZoomPan';
import TagDnDContext from 'src/frontend/contexts/TagDnDContext';
import FileStore from 'src/frontend/stores/FileStore';
import UiStore from 'src/frontend/stores/UiStore';
import { IconSet, Split } from 'widgets';
import Inspector from '../Inspector';
import { GalleryEventHandler, GallerySelector, MissingImageFallback } from './GalleryItem';
import { createSubmitCommand } from './LayoutSwitcher';
import { ITransform } from './Masonry/MasonryWorkerAdapter';

interface ISlideMode {
  contentRect: { width: number; height: number };
  uiStore: UiStore;
  fileStore: FileStore;
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
}

const SlideMode = observer((props: ISlideMode) => {
  const { contentRect, uiStore, fileStore, showContextMenu } = props;
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

  const dndData = useContext(TagDnDContext);
  const submitCommand = useMemo(
    () => createSubmitCommand(dndData, fileStore, () => null, showContextMenu, uiStore),
    [dndData, fileStore, showContextMenu, uiStore],
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

  const transitionStart: ITransform | undefined = useMemo(() => {
    const thumbEl = document.querySelector(`[data-file-id="${file.id}"]`);
    const container = document.querySelector('.masonry');
    if (thumbEl && container) {
      const thumbElRect = thumbEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return {
        left: thumbElRect.left - containerRect.left,
        top: thumbElRect.top - containerRect.top,
        width: thumbElRect.width,
        height: thumbElRect.height,
      };
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <ZoomableImage
      src={file.absolutePath}
      width={width}
      height={height}
      imgWidth={file.width}
      imgHeight={file.height}
      transitionStart={transitionStart}
      prevImage={uiStore.firstItem - 1 >= 0 ? decrImgIndex : undefined}
      nextImage={uiStore.firstItem + 1 < fileStore.fileList.length ? incrImgIndex : undefined}
      onContextMenu={handleContextMenu}
      onDrop={eventHandlers.onDrop}
      tabIndex={-1}
    />
  );
});

interface IZoomableImageProps {
  src: string;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
  prevImage?: () => any;
  nextImage?: () => any;
  transitionStart?: ITransform;
  onContextMenu: (e: React.MouseEvent) => void;
}

const ZoomableImage: React.FC<IZoomableImageProps & React.HTMLAttributes<HTMLDivElement>> = ({
  src,
  width,
  height,
  imgWidth,
  imgHeight,
  prevImage,
  nextImage,
  transitionStart,
  onContextMenu,
  ...rest
}: IZoomableImageProps) => {
  const [loadError, setLoadError] = useState<any>();
  useEffect(() => setLoadError(undefined), [src]);
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
      {loadError ? (
        <MissingImageFallback
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
        />
      ) : (
        // https://github.com/bradstiff/react-responsive-pinch-zoom-pan
        <ZoomPan
          position="center"
          initialScale="auto"
          imageDimensions={{ width: imgWidth, height: imgHeight }}
          containerDimensions={{ width, height }}
          // FIXME: minScale breaks zooming for high resolution images (like 8K) since the initial zoom is below minZoom
          minScale={0.1}
          maxScale={5}
          transitionStart={
            transitionStart
              ? {
                  top: transitionStart.top,
                  left: transitionStart.left,
                  scale: transitionStart.height / imgHeight,
                }
              : undefined
          }
          // debug
        >
          <img src={src} alt={`Image could not be loaded: ${src}`} onError={setLoadError} />
        </ZoomPan>
      )}

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
