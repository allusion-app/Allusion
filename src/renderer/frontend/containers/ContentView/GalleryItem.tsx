import React, { useState, useEffect, useCallback, useContext } from 'react';
import { shell } from 'electron';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';

import { ClientFile } from '../../../entities/File';
import { Button, ButtonGroup, IconSet, Tag } from 'components';
import { MenuItem } from 'components/menu';
import { Tooltip } from 'components/popover';
import ImageInfo from '../../components/ImageInfo';
import StoreContext from '../../contexts/StoreContext';
import { ensureThumbnail } from '../../ThumbnailGeneration';

interface ICellProps {
  file: ClientFile;
  suspended: boolean;
}

const enum ThumbnailState {
  Ok,
  Loading,
  Error,
}

// TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
// e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path
const Thumbnail = observer(({ file, suspended }: ICellProps) => {
  const {
    uiStore: { thumbnailDirectory },
  } = useContext(StoreContext);
  const { thumbnailPath } = file;

  // Initially, we assume the thumbnail exists
  const [state, setState] = useState(ThumbnailState.Ok);

  // This will check whether a thumbnail exists, generate it if needed
  useEffect(() => {
    if (suspended) {
      return;
    }
    ensureThumbnail(file, thumbnailDirectory)
      .then(
        action((exists: boolean) => {
          if (exists) {
            setState(ThumbnailState.Ok);
          } else if (file.isBroken !== true) {
            setState(ThumbnailState.Loading);
          } else {
            setState(ThumbnailState.Error);
          }
        }),
      )
      .catch(() => setState(ThumbnailState.Error));
  }, [file, suspended, thumbnailDirectory]);

  // The thumbnailPath of an image is always set, but may not exist yet.
  // When the thumbnail is finished generating, the path will be changed to `${thumbnailPath}?v=1`,
  // which we detect here to know the thumbnail is ready
  useEffect(() => {
    if (!suspended && thumbnailPath.endsWith('?v=1')) {
      setState(ThumbnailState.Ok);
    }
  }, [thumbnailPath, suspended]);

  // When the thumbnail cannot be loaded, display an error
  const handleImageError = useCallback(
    (err) => {
      console.log('Could not load image:', thumbnailPath, err);
      setState(ThumbnailState.Error);
    },
    [thumbnailPath],
  );

  if (state === ThumbnailState.Ok) {
    return <img src={thumbnailPath} onError={handleImageError} alt="" />;
  } else if (state === ThumbnailState.Loading) {
    return <div className="donut-loading" />;
  } else {
    return <MissingImageFallback />;
  }
});

export const MissingImageFallback = ({ style }: { style?: React.CSSProperties }) => (
  <div style={style} className="image-error custom-icon-128">
    {IconSet.DB_ERROR}Could not load image
  </div>
);

const ItemTags = observer(({ file, suspended }: ICellProps) => {
  if (suspended) {
    return <span className="thumbnail-tags" />;
  } else {
    return (
      <span className="thumbnail-tags">
        {Array.from(file.tags, (tag) => (
          <Tag key={tag.id} text={tag.name} color={tag.viewColor} />
        ))}
      </span>
    );
  }
});

export const MissingFileMenuItems = observer(() => {
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
});

export const FileViewerMenuItems = observer(({ file }: { file: ClientFile }) => {
  const { uiStore } = useContext(StoreContext);
  const handleViewFullSize = () => {
    uiStore.selectFile(file, true);
    uiStore.toggleSlideMode();
  };

  const handlePreviewWindow = () => {
    if (!uiStore.fileSelection.has(file)) {
      uiStore.selectFile(file, true);
    }
    uiStore.openPreviewWindow();
  };

  const handleInspect = () => {
    uiStore.clearFileSelection();
    uiStore.selectFile(file);
    if (!uiStore.isInspectorOpen) {
      uiStore.toggleInspector();
    }
  };

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
});

export const ExternalAppMenuItems = ({ path }: { path: string }) => (
  <>
    <MenuItem
      onClick={() => shell.openExternal(path)}
      text="Open External"
      icon={IconSet.OPEN_EXTERNAL}
    />
    <MenuItem
      onClick={() => shell.showItemInFolder(path)}
      text="Reveal in File Browser"
      icon={IconSet.FOLDER_CLOSE}
    />
  </>
);

export const ListCell = observer(({ file, suspended }: ICellProps) => {
  const { uiStore } = useContext(StoreContext);
  const [mounted, setMounted] = useState(suspended);

  useEffect(() => {
    if (!suspended) {
      setMounted(true);
    }
  }, [suspended]);

  return (
    <div role="gridcell" aria-selected={uiStore.fileSelection.has(file)}>
      <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
        <Thumbnail suspended={!mounted} file={file} />
      </div>
      {file.isBroken === true ? (
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
      ) : (
        <>
          <h2>{file.filename}</h2>
          <ImageInfo suspended={!mounted} file={file} />
        </>
      )}
      <ItemTags file={file} suspended={!mounted} />
    </div>
  );
});

export const GridCell = observer(
  ({ file, colIndex, suspended }: ICellProps & { colIndex: number }) => {
    const { uiStore, fileStore } = useContext(StoreContext);
    const [mounted, setMounted] = useState(false);

    useEffect(() => {
      if (!suspended) {
        setMounted(true);
      }
    }, [suspended]);

    return (
      <div role="gridcell" aria-colindex={colIndex} aria-selected={uiStore.fileSelection.has(file)}>
        <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
          <Thumbnail suspended={!mounted} file={file} />
        </div>
        {file.isBroken === true && (
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
        )}
        <ItemTags file={file} suspended={!mounted} />
      </div>
    );
  },
);
