import React, { useState, useEffect, useCallback, useContext } from 'react';
import { shell } from 'electron';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../../entities/File';
import { Button, ButtonGroup, IconSet, Tag } from 'components';
import { MenuItem } from 'components/menu';
import { Tooltip } from 'components/popover';
import ImageInfo from '../../components/ImageInfo';
import StoreContext from '../../contexts/StoreContext';
import { ensureThumbnail } from '../../ThumbnailGeneration';

const Thumbnail = observer(({ file }: { file: ClientFile }) => {
  const { uiStore } = useContext(StoreContext);

  // Initially, we assume the thumbnail exists
  const [isReady, setIsReady] = useState(true);
  const [isGenerating, setisGenerating] = useState(false);

  // This will check whether a thumbnail exists, generate it if needed
  useEffect(() => {
    ensureThumbnail(file, uiStore.thumbnailDirectory).then((exists) => {
      if (!exists) {
        setIsReady(false);
        if (file.isBroken !== true) {
          setisGenerating(true);
        }
      }
    });
  }, [file, uiStore.thumbnailDirectory]);

  // The thumbnailPath of an image is always set, but may not exist yet.
  // When the thumbnail is finished generating, the path will be changed to `${thumbnailPath}?v=1`,
  // which we detect here to know the thumbnail is ready
  useEffect(() => {
    if (file.thumbnailPath.endsWith('?v=1')) {
      setIsReady(true);
      setisGenerating(false);
    }
  }, [file.thumbnailPath]);

  // When the thumbnail cannot be loaded, display an error
  const handleImageError = useCallback(
    (err: any) => {
      console.log('Could not load image:', file.thumbnailPath, err);
      setIsReady(false);
    },
    [file.thumbnailPath],
  );

  return (
    <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
      {isReady ? (
        // Show image when it has been loaded
        <img src={file.thumbnailPath} onError={handleImageError} alt="" />
      ) : isGenerating ? (
        // If it's being generated, show a placeholder
        <div className="donut-loading" />
      ) : (
        // Show an error it it could not be loaded
        <MissingImageFallback />
      )}
    </div>
  );
});

export const MissingImageFallback = ({ style }: { style?: React.CSSProperties }) => (
  <div style={style} className="image-error custom-icon-128">
    {IconSet.DB_ERROR}Could not load image
  </div>
);

const FileRecovery = observer(
  ({ file, showDetails }: { file: ClientFile; showDetails?: boolean }) => {
    const { uiStore, fileStore } = useContext(StoreContext);
    if (showDetails === true) {
      return (
        <div>
          <p>The file {file.name} could not be found.</p>
          <p>Would you like to remove it from your library?</p>
          <ButtonGroup>
            <Button
              text="Remove"
              styling="outlined"
              onClick={() => {
                uiStore.selectFile(file, true);
                uiStore.openToolbarFileRemover();
              }}
            />
          </ButtonGroup>
        </div>
      );
    } else {
      return (
        <Tooltip content="This image could not be found.">
          <span
            className="thumbnail-broken-overlay"
            onClick={(e) => {
              e.stopPropagation(); // prevent image click event
              fileStore.fetchMissingFiles();
              uiStore.selectFile(file, true);
            }}
          >
            {IconSet.WARNING_BROKEN_LINK}
          </span>
        </Tooltip>
      );
    }
  },
);

interface IThumbnailDecoration {
  showDetails?: boolean;
  file: ClientFile;
}

const ThumbnailDecoration = observer(({ showDetails, file }: IThumbnailDecoration) => {
  if (file.isBroken === true) {
    return <FileRecovery file={file} showDetails={showDetails} />;
  } else if (showDetails === true) {
    return (
      <>
        <h2>{file.filename}</h2>
        <ImageInfo file={file} />
      </>
    );
  } else {
    return null;
  }
});

interface IGalleryItemProps {
  file: ClientFile;
  colIndex: number;
  showDetails?: boolean;
}

const GalleryItem = observer(({ file, showDetails, colIndex }: IGalleryItemProps) => {
  const { uiStore } = useContext(StoreContext);
  const isSelected = uiStore.fileSelection.has(file.id);

  // TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
  // e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path

  return (
    <div role="gridcell" aria-colindex={colIndex} aria-selected={isSelected}>
      <Thumbnail file={file} />
      <ThumbnailDecoration showDetails={showDetails} file={file} />
      <span className="thumbnail-tags">
        {file.clientTags.map((tag) => (
          <Tag key={tag.id} text={tag.name} color={tag.viewColor} />
        ))}
      </span>
    </div>
  );
});

export const MissingFileMenuItems = () => {
  const { uiStore, fileStore } = useContext(StoreContext);
  return (
    <>
      <MenuItem
        onClick={fileStore.fetchMissingFiles}
        text="Open Recovery Panel"
        icon={IconSet.WARNING_BROKEN_LINK}
        disabled={fileStore.showsMissingContent}
      />
      <MenuItem onClick={uiStore.openToolbarFileRemover} text="Delete" icon={IconSet.DELETE} />
    </>
  );
};

export const FileViewerMenuItems = ({ file }: { file: ClientFile }) => {
  const { uiStore } = useContext(StoreContext);
  const handleViewFullSize = useCallback(() => {
    uiStore.selectFile(file, true);
    uiStore.toggleSlideMode();
  }, [file, uiStore]);

  const handlePreviewWindow = useCallback(() => {
    if (!uiStore.fileSelection.has(file.id)) {
      uiStore.selectFile(file, true);
    }
    uiStore.openPreviewWindow();
  }, [file, uiStore]);

  const handleInspect = useCallback(() => {
    uiStore.clearFileSelection();
    uiStore.selectFile(file);
    if (!uiStore.isInspectorOpen) {
      uiStore.toggleInspector();
    }
  }, [file, uiStore]);

  return (
    <>
      <MenuItem onClick={handleViewFullSize} text="View at Full Size" icon={IconSet.SEARCH} />
      <MenuItem
        onClick={handlePreviewWindow}
        text="Open In Preview Window"
        icon={IconSet.PREVIEW}
      />
      <MenuItem onClick={handleInspect} text="Inspect" icon={IconSet.INFO} />
    </>
  );
};

export const ExternalAppMenuItems = ({ path }: { path: string }) => {
  const handleOpen = useCallback(() => shell.openPath(path), [path]);
  const handleOpenFileExplorer = useCallback(() => shell.showItemInFolder(path), [path]);
  return (
    <>
      <MenuItem onClick={handleOpen} text="Open External" icon={IconSet.OPEN_EXTERNAL} />
      <MenuItem
        onClick={handleOpenFileExplorer}
        text="Reveal in File Browser"
        icon={IconSet.FOLDER_CLOSE}
      />
    </>
  );
};

// A simple version of the GalleryItem, only rendering the minimally required info (thumbnail + name)
const SimpleGalleryItem = observer(({ file, showDetails, colIndex }: IGalleryItemProps) => {
  return (
    <div role="gridcell" aria-colindex={colIndex}>
      <div className="thumbnail">
        <img src={file.thumbnailPath} alt="" />
      </div>
      {showDetails && (
        <>
          <h2>{file.filename}</h2>
          <ImageInfo suspended file={file} />
        </>
      )}
      <span className="thumbnail-tags" />
    </div>
  );
});

const DelayedGalleryItem = (props: IGalleryItemProps) => {
  const [showSimple, setShowSimple] = useState(true);
  useEffect(() => {
    const timeout = setTimeout(() => setShowSimple(false), 300);
    return () => clearTimeout(timeout);
  });
  return showSimple ? <SimpleGalleryItem {...props} /> : <GalleryItem {...props} />;
};

export default observer(DelayedGalleryItem);
