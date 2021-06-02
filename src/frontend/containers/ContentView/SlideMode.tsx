import { autorun, runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import PinchZoomPan from 'react-responsive-pinch-zoom-pan';
import { useTagDnD } from 'src/frontend/contexts/TagDnDContext';
import { IconSet, Split } from 'widgets';
import Inspector from '../Inspector';
import { createSubmitCommand } from './LayoutSwitcher';
import { GallerySelector, MissingImageFallback } from './GalleryItem';
import { Preferences } from 'src/frontend/stores/Preferences';
import { clamp } from 'src/frontend/utils';
import { useStore } from 'src/frontend/contexts/StoreContext';
import { useAction } from 'src/frontend/hooks/useAction';

interface ISlideMode {
  contentRect: { width: number; height: number };
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
}

const SlideMode = observer((props: ISlideMode) => {
  const { contentRect, showContextMenu } = props;
  const { uiStore } = useStore();
  const { isInspectorOpen, inspectorWidth } = uiStore.preferences;
  const contentWidth = contentRect.width - (isInspectorOpen ? inspectorWidth : 0);
  const contentHeight = contentRect.height;

  const slideView = (
    <SlideView showContextMenu={showContextMenu} width={contentWidth} height={contentHeight} />
  );

  const handleMove = useAction((x: number, width: number) => {
    const { preferences } = uiStore;
    // The inspector is on the right side, so we need to calculate the offset.
    const offsetX = width - x;
    if (preferences.isInspectorOpen) {
      const w = clamp(offsetX, Preferences.MIN_INSPECTOR_WIDTH, width * 0.75);
      preferences.inspectorWidth = w;

      if (offsetX < Preferences.MIN_INSPECTOR_WIDTH * 0.75) {
        preferences.isInspectorOpen = false;
      }
    } else if (offsetX >= Preferences.MIN_INSPECTOR_WIDTH) {
      preferences.isInspectorOpen = true;
    }
  });

  return (
    <Split
      id="slide-mode"
      primary={<Inspector />}
      secondary={slideView}
      axis="vertical"
      align="right"
      splitPoint={inspectorWidth}
      isExpanded={isInspectorOpen}
      onMove={handleMove}
    />
  );
});

interface ISlideView {
  showContextMenu: (x: number, y: number, menu: [JSX.Element, JSX.Element]) => void;
  width: number;
  height: number;
}

const SlideView = observer((props: ISlideView) => {
  const { width, height, showContextMenu } = props;
  const rootStore = useStore();
  const { uiStore, fileStore } = rootStore;
  const file = fileStore.fileList[uiStore.firstItem];

  const dndData = useTagDnD();
  const submitCommand = useMemo(
    () => createSubmitCommand(rootStore, dndData, () => null, showContextMenu),
    [dndData, rootStore, showContextMenu],
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

  useEffect(() => {
    // Go to the first selected image on load
    runInAction(() => {
      if (fileStore.firstSelectedFile !== undefined) {
        uiStore.setFirstItem(fileStore.getIndex(fileStore.firstSelectedFile.id));
      }
    });

    // Preload next and previous image for better UX
    return autorun(() => {
      if (uiStore.firstItem + 1 < fileStore.fileList.length) {
        const nextImg = new Image();
        nextImg.src = fileStore.fileList[uiStore.firstItem + 1].absolutePath;
      }
      if (uiStore.firstItem - 1 >= 0) {
        const prevImg = new Image();
        prevImg.src = fileStore.fileList[uiStore.firstItem - 1].absolutePath;
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

  const decrImgIndex = useAction(() => uiStore.setFirstItem(Math.max(0, uiStore.firstItem - 1)));
  const incrImgIndex = useAction(() =>
    uiStore.setFirstItem(Math.min(uiStore.firstItem + 1, fileStore.fileList.length - 1)),
  );

  // Detect left/right arrow keys to scroll between images
  const handleUserKeyPress = useRef((event: KeyboardEvent) => {
    if (event.key === 'ArrowLeft') {
      decrImgIndex();
    } else if (event.key === 'ArrowRight') {
      incrImgIndex();
    } else if (event.key === 'Escape' || event.key === 'Backspace') {
      uiStore.disableSlideMode();
    }
  }).current;

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
    };
  }, [handleUserKeyPress]);

  return (
    <ZoomableImage
      src={file.absolutePath}
      width={width}
      height={height}
      prevImage={uiStore.firstItem - 1 >= 0 ? decrImgIndex : undefined}
      nextImage={uiStore.firstItem + 1 < fileStore.fileList.length ? incrImgIndex : undefined}
      onContextMenu={handleContextMenu}
    />
  );
});

interface IZoomableImageProps {
  src: string;
  width: number;
  height: number;
  prevImage?: () => any;
  nextImage?: () => any;
  onContextMenu: (e: React.MouseEvent) => void;
}

const ZoomableImage: React.FC<IZoomableImageProps> = ({
  src,
  width,
  height,
  prevImage,
  nextImage,
  onContextMenu,
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
        <PinchZoomPan
          position="center"
          zoomButtons={false}
          // FIXME: minScale breaks zooming for high resolution images (like 8K) since the initial zoom is below minZoom
          // but we're hopefully writing a custom image viewer soon
          minScale={0.1}
          maxScale={5}
          // Force a re-render when the image changes, in order to reset the zoom level
          key={src}
        >
          <img src={src} alt={`Image could not be loaded: ${src}`} onError={setLoadError} />
        </PinchZoomPan>
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
