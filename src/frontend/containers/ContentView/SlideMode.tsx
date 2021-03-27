import { runInAction } from 'mobx';
import { observer } from 'mobx-react-lite';
import React, { useCallback, useContext, useEffect, useMemo } from 'react';
import PinchZoomPan from 'react-responsive-pinch-zoom-pan';
import TagDnDContext from 'src/frontend/contexts/TagDnDContext';
import { encodeFilePath } from 'src/frontend/utils';
import { IconSet } from 'widgets';
import Inspector from '../Inspector';
import { createSubmitCommand, ILayoutProps } from './Gallery';
import { GallerySelector, MissingImageFallback } from './GalleryItem';

const SlideMode = observer((props: ILayoutProps) => {
  const { contentRect, uiStore, fileStore, showContextMenu } = props;

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

  // Automatically select the active image, so it is shown in the inspector
  useEffect(() => {
    runInAction(() => {
      if (uiStore.firstItem < fileStore.fileList.length) {
        uiStore.selectFile(fileStore.fileList[uiStore.firstItem], true);
      }
    });
  }, [fileStore.fileList, fileStore.fileList.length, uiStore, uiStore.firstItem]);

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

  // Detect scroll wheel to scroll between images
  // const handleUserWheel = useCallback(
  //   (event: WheelEvent) => {
  //     if (event.ctrlKey) {
  //       return;
  //     }
  //     event.preventDefault();

  //     if (event.deltaY > 0) {
  //       decrImgIndex();
  //     } else if (event.deltaY < 0) {
  //       incrImgIndex();
  //     }
  //   },
  //   [incrImgIndex, decrImgIndex],
  // );

  // Set up event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleUserKeyPress);
    // window.addEventListener('wheel', handleUserWheel, { passive: false });
    return () => {
      window.removeEventListener('keydown', handleUserKeyPress);
      // window.removeEventListener('wheel', handleUserWheel);
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

  const inspectorWidth = 288; // TODO: Get from CSS. Something like below, but that works correctly (currently too low)
  // useMemo(() =>
  //   parseInt(getComputedStyle(document.body).getPropertyValue('--inspector-width')) // rem value: get pixels by multplying with font size
  //   * parseInt(getComputedStyle(document.body).getPropertyValue('font-size')),
  //   []);
  const contentWidth = contentRect.width - (uiStore.isInspectorOpen ? inspectorWidth : 0);

  // TODO: If image is broken, cannot go back/forward
  return (
    <div id="slide-mode" onContextMenu={handleContextMenu}>
      {file.isBroken ? (
        <MissingImageFallback
          style={{
            width: `${contentWidth}px`,
            height: `${contentRect.height}px`,
          }}
        />
      ) : (
        <ZoomableImage
          src={file.absolutePath}
          width={contentWidth}
          height={contentRect.height}
          prevImage={uiStore.firstItem - 1 >= 0 ? decrImgIndex : undefined}
          nextImage={uiStore.firstItem + 1 < fileStore.fileList.length ? incrImgIndex : undefined}
        />
      )}
      <Inspector />
    </div>
  );
});

interface IZoomableImageProps {
  src: string;
  width: number;
  height: number;
  prevImage?: () => any;
  nextImage?: () => any;
}

const ZoomableImage = ({ src, width, height, prevImage, nextImage }: IZoomableImageProps) => {
  // Todo: Same context menu as GalleryItem
  return (
    <div id="zoomableImage">
      <div
        style={{
          width: `${width}px`,
          maxHeight: `${height}px`,
        }}
      >
        {/* https://github.com/bradstiff/react-responsive-pinch-zoom-pan */}
        <PinchZoomPan
          position="center"
          zoomButtons={false}
          doubleTapBehavior="zoom"
          // Force a re-render when the image changes, in order to reset the zoom level
          key={src}
        >
          <img src={encodeFilePath(src)} alt="Could not load your image!" />
        </PinchZoomPan>

        {/* Overlay buttons/icons */}
        {prevImage && (
          <div className="side-button custom-icon-48" onClick={prevImage}>
            {IconSet.ARROW_LEFT}
          </div>
        )}
        {nextImage && (
          <div className="side-button custom-icon-48" onClick={nextImage} style={{ right: 0 }}>
            {IconSet.ARROW_RIGHT}
          </div>
        )}
      </div>
    </div>
  );
};

export default SlideMode;
