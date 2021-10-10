import { shell } from 'electron';
import { reaction } from 'mobx';
import { observer } from 'mobx-react-lite';
import SysPath from 'path';
import React, { useEffect, useMemo, useState } from 'react';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAction, useAutorun, useComputed } from 'src/frontend/hooks/mobx';
import { Poll, Result, usePromise } from 'src/frontend/hooks/usePromise';
import FileStore from 'src/frontend/stores/FileStore';
import UiStore from 'src/frontend/stores/UiStore';
import { encodeFilePath } from 'src/frontend/utils';
import { Button, IconSet, Split } from 'widgets';
import Inspector from '../../Inspector';
import { CommandDispatcher } from '../Commands';
import { ContentRect } from '../LayoutSwitcher';
import ZoomPan, { SlideTransform } from '../SlideMode/ZoomPan';
import { createDimension, createTransform, Vec2 } from './utils';

const SlideMode = observer(({ contentRect }: { contentRect: ContentRect }) => {
  const { uiStore, fileStore } = useStore();
  const isInspectorOpen = uiStore.isInspectorOpen;
  const inspectorWidth = uiStore.inspectorWidth;
  const contentWidth = contentRect.width - (isInspectorOpen ? inspectorWidth : 0);
  const contentHeight = contentRect.height;

  return (
    <Split
      id="slide-mode"
      className={uiStore.isSlideMode ? 'fade-in' : 'fade-out'}
      primary={<Inspector />}
      secondary={
        <SlideView
          uiStore={uiStore}
          fileStore={fileStore}
          width={contentWidth}
          height={contentHeight}
        />
      }
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
  uiStore: UiStore;
  fileStore: FileStore;
}

const SlideView = observer((props: SlideViewProps) => {
  const { uiStore, fileStore, width, height } = props;
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

  // Detect left/right arrow keys to scroll between images
  useEffect(() => {
    const handleUserKeyPress = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft') {
        decrImgIndex();
      } else if (event.key === 'ArrowRight') {
        incrImgIndex();
      } else if (event.key === 'Escape' || event.key === 'Backspace') {
        uiStore.disableSlideMode();
      }
    };
    window.addEventListener('keydown', handleUserKeyPress);
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [decrImgIndex, incrImgIndex, uiStore]);

  // Preload next and previous image for better UX
  useAutorun(() => {
    if (!isLast.get()) {
      const nextImg = new Image();
      const nextFile = fileStore.fileList[uiStore.firstItem + 1];
      fileStore.imageLoader
        .getImageSrc(nextFile)
        .then((src) => (nextImg.src = encodeFilePath(src || nextFile.absolutePath)))
        .catch(() => (nextImg.src = encodeFilePath(nextFile.absolutePath)));
    }
    if (!isFirst.get()) {
      const prevImg = new Image();
      const prevFile = fileStore.fileList[uiStore.firstItem - 1];
      fileStore.imageLoader
        .getImageSrc(prevFile)
        .then((src) => (prevImg.src = encodeFilePath(src || prevFile.absolutePath)))
        .catch(() => (prevImg.src = encodeFilePath(prevFile.absolutePath)));
    }
  });

  const transitionStart: SlideTransform | undefined = useMemo(() => {
    const thumbEl = document.querySelector(`[data-file-id="${file.id}"]`);
    const container = document.querySelector('#gallery-content');
    if (thumbEl && container) {
      const thumbElRect = thumbEl.getBoundingClientRect();
      const containerRect = container.getBoundingClientRect();
      console.log(containerRect, width, height);
      return createTransform(
        thumbElRect.left - containerRect.left,
        thumbElRect.top - containerRect.top,
        thumbElRect.height / file.height,
      );
    }
    return undefined;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [file.id]);

  // Image src can be set asynchronously: keep track of it in a state
  // Needed for image formats not natively supported by the browser (e.g. tiff): will be converted to another format
  const source: Poll<Result<string, any>> = usePromise(
    file,
    file.thumbnailPath,
    (file, thumbnailPath) =>
      fileStore.imageLoader.getImageSrc(file).then((src) => src ?? thumbnailPath),
  );

  return (
    <ZoomableImage
      absolutePath={file.absolutePath}
      source={source}
      thumbnailSrc={file.thumbnailPath}
      width={width}
      height={height}
      imgWidth={file.width}
      imgHeight={file.height}
      transitionStart={transitionStart}
      transitionEnd={uiStore.isSlideMode ? undefined : transitionStart}
      prevImage={!isFirst.get() ? decrImgIndex : undefined}
      nextImage={!isLast.get() ? incrImgIndex : undefined}
      eventManager={eventManager}
      onClose={uiStore.disableSlideMode}
    />
  );
});

interface ZoomableImageProps {
  absolutePath: string;
  source: Poll<Result<string, any>>;
  thumbnailSrc?: string;
  width: number;
  height: number;
  imgWidth: number;
  imgHeight: number;
  prevImage?: () => void;
  nextImage?: () => void;
  transitionStart?: SlideTransform;
  transitionEnd?: SlideTransform;
  eventManager: CommandDispatcher;
  onClose: () => void;
}

const ZoomableImage: React.FC<ZoomableImageProps> = ({
  absolutePath,
  source,
  thumbnailSrc,
  width,
  height,
  imgWidth,
  imgHeight,
  prevImage,
  nextImage,
  transitionStart,
  transitionEnd,
  eventManager,
  onClose,
}: ZoomableImageProps) => {
  const image: Poll<Result<{ src: string; dimension: Vec2 }, any>> = usePromise(
    source,
    thumbnailSrc,
    absolutePath,
    imgWidth,
    imgHeight,
    (imageSource, thumbnailSrc, absolutePath, imgWidth, imgHeight) => {
      switch (imageSource.tag) {
        case 'pending':
          return Promise.resolve({
            src: thumbnailSrc || absolutePath,
            dimension: createDimension(imgWidth, imgHeight),
          });
        case 'ready':
          switch (imageSource.value.tag) {
            case 'ok':
              const src = imageSource.value.value;
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
            case 'err':
              return Promise.reject();
          }
        default:
          throw new Error('Unreachable!');
      }
    },
  );

  let content;
  if (image.tag === 'ready') {
    if (image.value.tag === 'ok') {
      const { src, dimension } = image.value.value;
      const minScale = Math.min(0.1, Math.min(width / dimension[0], height / dimension[1]));
      content = (
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
    } else if (image.value.tag === 'err') {
      content = <ImageFallback absolutePath={absolutePath} thumbnailPath={thumbnailSrc} />;
    }
  }

  return (
    <ZoomPanContainer
      width={width}
      height={height}
      prevImage={prevImage}
      nextImage={nextImage}
      eventManager={eventManager}
    >
      {content}
    </ZoomPanContainer>
  );
};

export default SlideMode;

interface ZoomPanContainerProps {
  width: number;
  height: number;
  prevImage?: () => void;
  nextImage?: () => void;
  eventManager: CommandDispatcher;
  children: React.ReactNode;
}

const ZoomPanContainer = ({
  width,
  height,
  eventManager,
  prevImage,
  nextImage,
  children,
}: ZoomPanContainerProps) => {
  return (
    <div
      id="zoomable-image"
      style={{ width, height }}
      onContextMenu={eventManager.showSlideContextMenu}
      onDrop={eventManager.drop}
      tabIndex={-1}
    >
      {children}
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

interface ImageFallbackProps {
  absolutePath: string;
  thumbnailPath?: string;
}

const ImageFallback = ({ absolutePath, thumbnailPath }: ImageFallbackProps) => {
  // Try to load the thumbnail, could also fail
  const [loadError, setLoadError] = useState<any>();
  useEffect(() => setLoadError(undefined), [thumbnailPath]);

  return (
    <div style={{ width: '100%', height: '100%' }}>
      {loadError ? (
        <div style={{ maxHeight: 360, maxWidth: 360 }} className="image-error" />
      ) : (
        <img
          alt=""
          onError={setLoadError}
          src={encodeFilePath(thumbnailPath ?? '')}
          style={{ maxHeight: 360 }}
        />
      )}
      <br />
      <span>Could not load {loadError ? '' : 'full '}image </span>
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
