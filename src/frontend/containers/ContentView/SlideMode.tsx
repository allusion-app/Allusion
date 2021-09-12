import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import ZoomPan, { ISlideTransform } from './SlideMode/ZoomPan';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import FileStore from 'src/frontend/stores/FileStore';
import UiStore from 'src/frontend/stores/UiStore';
import { Button, IconSet, Split } from 'widgets';
import Inspector from '../Inspector';
import { GalleryEventHandler, GallerySelector } from './GalleryItem';
import { createSubmitCommand } from './LayoutSwitcher';
import { shell } from 'electron';
import useMountState from 'src/frontend/hooks/useMountState';
import { encodeFilePath } from 'src/frontend/utils';

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
        const nextFile = fileStore.fileList[uiStore.firstItem + 1];
        fileStore.imageLoader
          .getImageSrc(nextFile)
          .then((src) => (nextImg.src = encodeFilePath(src || nextFile.absolutePath)))
          .catch(() => (nextImg.src = encodeFilePath(nextFile.absolutePath)));
      }
      if (uiStore.firstItem - 1 >= 0) {
        const prevImg = new Image();
        const prevFile = fileStore.fileList[uiStore.firstItem - 1];
        fileStore.imageLoader
          .getImageSrc(prevFile)
          .then((src) => (prevImg.src = encodeFilePath(src || prevFile.absolutePath)))
          .catch(() => (prevImg.src = encodeFilePath(prevFile.absolutePath)));
      }
    });
  }, [fileStore.fileList, fileStore.imageLoader, uiStore.firstItem]);

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

  // Image src can be set asynchronously: keep track of it in a state
  // Needed for image formats not natively supported by the browser (e.g. tiff): will be converted to another format
  const fileRef = useRef(file);
  const [, isMountedRef] = useMountState();
  const [imageSrc, setImageSrc] = useState(file.absolutePath);
  const [srcLoading, setSrcLoading] = useState(false);
  useEffect(() => {
    setSrcLoading(true);
    fileRef.current = file;
    setImageSrc(file.absolutePath);
    fileStore.imageLoader
      .getImageSrc(file)
      .then((src) => {
        // check if same file is still open when src is returned
        if (fileRef.current === file && isMountedRef.current) {
          setSrcLoading(false);
          if (src) {
            setImageSrc(src);
          }
        }
      })
      .catch(() => setSrcLoading(false));
  }, [file, fileStore.imageLoader, isMountedRef]);

  return (
    <ZoomableImage
      absolutePath={file.absolutePath}
      src={imageSrc}
      srcLoading={srcLoading}
      thumbnailSrc={file.thumbnailPath}
      width={width}
      height={height}
      imgWidth={file.width}
      imgHeight={file.height}
      transitionStart={transitionStart}
      transitionEnd={uiStore.isSlideMode ? undefined : transitionStart}
      prevImage={uiStore.firstItem - 1 >= 0 ? decrImgIndex : undefined}
      nextImage={uiStore.firstItem + 1 < fileStore.fileList.length ? incrImgIndex : undefined}
      doubleClickBehavior="zoomOrReset"
      onContextMenu={handleContextMenu}
      onDrop={eventHandlers.onDrop}
      onClose={uiStore.disableSlideMode}
      tabIndex={-1}
    />
  );
});

export const SlideMissingImageFallback = ({
  style,
  absolutePath,
  thumbnailPath,
  loading,
}: {
  style: React.CSSProperties;
  absolutePath: string;
  thumbnailPath?: string;
  loading?: boolean;
}) => {
  // Try to load the thumbnail, could also fail
  const [loadError, setLoadError] = useState<any>();
  useEffect(() => setLoadError(undefined), [thumbnailPath]);

  return (
    <div style={style} className="image-error">
      {loadError ? (
        <div className="custom-icon-128">{IconSet.DB_ERROR}</div>
      ) : (
        <img
          onError={setLoadError}
          src={encodeFilePath(thumbnailPath || '')}
          style={{ maxHeight: 360 }}
        />
      )}
      <br />
      <span>
        {loading ? (
          <>{IconSet.LOADING} Loading...</>
        ) : (
          <>Could not load {loadError ? '' : 'full '}image </>
        )}
        <pre
          title={absolutePath}
          style={{ maxWidth: '40ch', overflow: 'hidden', textOverflow: 'ellipsis' }}
        >
          {SysPath.basename(absolutePath)}
        </pre>
      </span>
      <Button
        onClick={() =>
          shell
            .openExternal(encodeFilePath(absolutePath))
            .catch((e) => console.error(e, absolutePath))
        }
        text="Open in external application"
      />
    </div>
  );
};

interface IZoomableImageProps {
  absolutePath: string;
  src: string;
  srcLoading: boolean;
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
  absolutePath,
  src,
  srcLoading,
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

  // in order to coordinate image dimensions at the time of loading, store current img src + dimensions together
  const [currentImg, setCurrentImg] = useState({
    src: thumbnailSrc || src,
    dimensions: { width: imgWidth, height: imgHeight },
  });

  const srcRef = useRef(src);
  useEffect(() => {
    // First load the thumbnail, for responsiveness
    setCurrentImg({
      src: thumbnailSrc || src,
      dimensions: { width: imgWidth, height: imgHeight },
    });

    // Try to load the full image, so we can show a fallback component when the image fails to load
    srcRef.current = src;
    setLoadError(undefined);

    const img = new Image();

    img.onload = () => {
      if (srcRef.current === src) {
        setCurrentImg((prevImg) => {
          // When the currentImage was the thumbnail of the image we just loaded, set the currentImage to the full image
          return prevImg.src === thumbnailSrc
            ? { src, dimensions: { width: imgWidth, height: imgHeight } }
            : prevImg;
        });
      }
    };

    img.onerror = (e: any) => {
      if (src === srcRef.current) {
        setLoadError(e);
      }
    };

    img.src = encodeFilePath(src);

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, thumbnailSrc]);

  const minScale = Math.min(0.1, Math.min(width / imgWidth, height / imgHeight));

  return (
    <div
      id="zoomable-image"
      style={
        loadError
          ? undefined
          : {
              maxWidth: `${width}px`,
              height: `${height}px`,
            }
      }
      onContextMenu={onContextMenu}
      {...rest}
    >
      {loadError ? (
        <SlideMissingImageFallback
          style={{
            width: `${width}px`,
            height: `${height}px`,
          }}
          absolutePath={absolutePath}
          thumbnailPath={thumbnailSrc}
          loading={srcLoading}
        />
      ) : (
        // {/* Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan */}
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
          <img
            src={encodeFilePath(currentImg.src)}
            width={currentImg.dimensions.width || undefined}
            height={currentImg.dimensions.height || undefined}
            alt={`Image could not be loaded: ${src}`}
            onError={setLoadError}
          />
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

SlideMode.displayName = 'SlideMode';

export default SlideMode;
