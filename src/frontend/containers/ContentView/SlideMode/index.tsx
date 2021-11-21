import { shell } from 'electron';
import { autorun, reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useEffect, useMemo } from 'react';
import { ClientFile } from 'src/entities/File';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAction, useComputed } from 'src/frontend/hooks/mobx';
import { Poll, Result, usePromise } from 'src/frontend/hooks/usePromise';
import { encodeFilePath } from 'src/frontend/utils';
import { Button, IconSet, Split } from 'widgets';
import Inspector from '../../Inspector';
import { CommandDispatcher } from '../Commands';
import { ContentRect } from '../LayoutSwitcher';
import ZoomPan, { CONTAINER_DEFAULT_STYLE, SlideTransform } from '../SlideMode/ZoomPan';
import { createDimension, createTransform, Vec2 } from './utils';

const SlideMode = observer(({ contentRect }: { contentRect: ContentRect }) => {
  const { uiStore } = useStore();
  const isInspectorOpen = uiStore.isInspectorOpen;
  const inspectorWidth = uiStore.inspectorWidth;
  const contentWidth = contentRect.width - (isInspectorOpen ? inspectorWidth : 0);
  const contentHeight = contentRect.height;

  return (
    <Split
      id="slide-mode"
      className={uiStore.isSlideMode ? 'fade-in' : 'fade-out'}
      primary={<Inspector />}
      secondary={<SlideView width={contentWidth} height={contentHeight} />}
      axis="vertical"
      align="right"
      splitPoint={inspectorWidth}
      isExpanded={isInspectorOpen}
      onMove={uiStore.moveInspectorSplitter}
    />
  );
});

interface SlideViewProps {
  width: number;
  height: number;
}

const SlideView = observer(({ width, height }: SlideViewProps) => {
  const { uiStore, fileStore, imageLoader } = useStore();
  const file = useComputed(() => fileStore.fileList[uiStore.firstItem]).get();
  const eventManager = useMemo(() => new CommandDispatcher(file), [file]);
  const isFirst = useComputed(() => uiStore.firstItem === 0);
  const isLast = useComputed(() => uiStore.firstItem === fileStore.fileList.length - 1);

  // Go to the first selected image on load
  useEffect(() => {
    return reaction(
      () => uiStore.firstSelectedFile?.id,
      (id, _, reaction) => {
        if (id !== undefined) {
          uiStore.setFirstItem(fileStore.getIndex(id));
          reaction.dispose();
        }
      },
      { fireImmediately: true },
    );
  }, [fileStore, uiStore]);

  // Go back to previous view when pressing the back button (mouse button 5)
  useEffect(() => {
    // Push a dummy state, so that a pop-state event can be activated
    history.pushState(null, document.title, location.href);
    const popStateHandler = uiStore.disableSlideMode;
    window.addEventListener('popstate', popStateHandler);
    return () => window.removeEventListener('popstate', popStateHandler);
  }, [uiStore]);

  const decrImgIndex = useAction(() => uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1)));
  const incrImgIndex = useAction(() =>
    uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileStore.fileList.length - 1)),
  );

  // Detect left/right arrow keys to scroll between images. Top/down is already handled in the layout that's open in the background
  useEffect(() => {
    const handleUserKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        decrImgIndex();
        event.stopPropagation();
      } else if (event.key === 'ArrowRight') {
        incrImgIndex();
        event.stopPropagation();
      } else if (event.key === 'Escape' || event.key === 'Backspace') {
        uiStore.disableSlideMode();
        event.stopPropagation();
      }
    };
    window.addEventListener('keydown', handleUserKeyPress);
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [decrImgIndex, incrImgIndex, uiStore]);

  // Preload next and previous image for better UX
  useEffect(() => {
    let isEffectRunning = true;
    const dispose = autorun(() => {
      if (!isLast.get()) {
        const nextImg = new Image();
        const nextFile = fileStore.fileList[uiStore.firstItem + 1];
        imageLoader
          .getImageSrc(nextFile)
          .then((src) => isEffectRunning && src && (nextImg.src = encodeFilePath(src)));
      }
      if (!isFirst.get()) {
        const prevImg = new Image();
        const prevFile = fileStore.fileList[uiStore.firstItem - 1];
        imageLoader
          .getImageSrc(prevFile)
          .then((src) => isEffectRunning && src && (prevImg.src = encodeFilePath(src)));
      }
    });
    return () => {
      isEffectRunning = false;
      dispose();
    };
  }, [fileStore, isFirst, isLast, uiStore, imageLoader]);

  const transitionStart: SlideTransform | undefined = useMemo(() => {
    const thumbEl = document.querySelector(`[data-file-id="${file.id}"]`);
    const container = document.querySelector('#gallery-content');
    if (thumbEl && container) {
      const thumbElRect = thumbEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      return createTransform(
        thumbElRect.top - containerRect.top,
        thumbElRect.left - containerRect.left,
        thumbElRect.height / file.height,
      );
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  return (
    <div
      id="zoomable-image"
      style={{ width, height }}
      onContextMenu={eventManager.showSlideContextMenu}
      onDrop={eventManager.drop}
      tabIndex={-1}
    >
      <ZoomableImage
        file={file}
        thumbnailSrc={file.thumbnailPath}
        width={width}
        height={height}
        transitionStart={transitionStart}
        transitionEnd={uiStore.isSlideMode ? undefined : transitionStart}
        onClose={uiStore.disableSlideMode}
      />
      <NavigationButtons
        isStart={isFirst.get()}
        isEnd={isLast.get()}
        prevImage={decrImgIndex}
        nextImage={incrImgIndex}
      />
    </div>
  );
});

interface ZoomableImageProps {
  file: ClientFile;
  thumbnailSrc: string;
  width: number;
  height: number;
  transitionStart?: SlideTransform;
  transitionEnd?: SlideTransform;
  onClose: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  file,
  thumbnailSrc,
  width,
  height,
  transitionStart,
  transitionEnd,
  onClose,
}: ZoomableImageProps) => {
  const { imageLoader } = useStore();
  const { absolutePath, width: imgWidth, height: imgHeight } = file;
  // Image src can be set asynchronously: keep track of it in a state
  // Needed for image formats not natively supported by the browser (e.g. tiff): will be converted to another format
  const source: Poll<Result<string, any>> = usePromise(
    file,
    thumbnailSrc,
    async (file, thumbnailPath) => {
      const src = await imageLoader.getImageSrc(file);
      return src ?? thumbnailPath;
    },
  );

  const image: Poll<Result<{ src: string; dimension: Vec2 }, any>> = usePromise(
    source,
    absolutePath,
    thumbnailSrc,
    imgWidth,
    imgHeight,
    (source, absolutePath, thumbnailSrc, imgWidth, imgHeight) => {
      if (source.tag === 'ready') {
        if ('ok' in source.value) {
          const src = source.value.ok;
          return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = function (this: any) {
              resolve({
                src,
                dimension: createDimension(this.naturalWidth, this.naturalHeight),
              });
            };
            img.onerror = reject;
            img.src = encodeFilePath(src);
          });
        } else {
          return Promise.reject(source.value.err);
        }
      } else {
        return Promise.resolve({
          src: thumbnailSrc || absolutePath,
          dimension: createDimension(imgWidth, imgHeight),
        });
      }
    },
  );

  if (image.tag === 'ready' && 'err' in image.value) {
    return <ImageFallback error={image.value.err} absolutePath={absolutePath} />;
  } else {
    const { src, dimension } =
      image.tag === 'ready' && 'ok' in image.value
        ? image.value.ok
        : {
            src: thumbnailSrc || absolutePath,
            dimension: createDimension(imgWidth, imgHeight),
          };
    const minScale = Math.min(0.1, Math.min(width / dimension[0], height / dimension[1]));
    return (
      <ZoomPan
        position="center"
        initialScale="auto"
        doubleTapBehavior="zoomOrReset"
        imageDimension={dimension}
        containerDimension={createDimension(width, height)}
        minScale={minScale}
        maxScale={5}
        transitionStart={transitionStart}
        transitionEnd={transitionEnd}
        onClose={onClose}
      >
        <img src={encodeFilePath(src)} width={dimension[0]} height={dimension[1]} alt="" />
      </ZoomPan>
    );
  }
};

export default SlideMode;

interface NavigationButtonsProps {
  isStart: boolean;
  isEnd: boolean;
  prevImage: () => void;
  nextImage: () => void;
}

const NavigationButtons = ({ isStart, isEnd, prevImage, nextImage }: NavigationButtonsProps) => {
  const none = { display: 'none' };
  const initial = { display: 'initial' };
  return (
    <>
      <button
        style={isStart ? none : initial}
        aria-label="previous image"
        className="side-button-left"
        onClick={prevImage}
      >
        {IconSet.ARROW_LEFT}
      </button>
      <button
        style={isEnd ? none : initial}
        aria-label="next image"
        className="side-button-right"
        onClick={nextImage}
      >
        {IconSet.ARROW_RIGHT}
      </button>
    </>
  );
};

interface ImageFallbackProps {
  error: any;
  absolutePath: string;
}

const ImageFallback = ({ error, absolutePath }: ImageFallbackProps) => {
  return (
    <div style={CONTAINER_DEFAULT_STYLE} className="image-fallback">
      <div style={{ maxHeight: 360, maxWidth: 360 }} className="image-error" />
      <br />
      <span>Could not load {error ? '' : 'full '}image </span>
      <pre
        title={absolutePath}
        style={{ maxWidth: '40ch', overflow: 'hidden', textOverflow: 'ellipsis' }}
      >
        {SysPath.basename(absolutePath)}
      </pre>
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
