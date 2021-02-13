import React, { useState, useEffect } from 'react';
import { observer } from 'mobx-react-lite';

import { ensureThumbnail } from '../../ThumbnailGeneration';

import { ClientFile } from 'src/entities/File';

import UiStore from '../../stores/UiStore';
import FileStore from '../../stores/FileStore';

import { Button, ButtonGroup, IconSet, Tag } from 'widgets';
import { Tooltip } from 'widgets/popovers';

import ImageInfo from '../../components/ImageInfo';
import { ITransform } from './Masonry/masonry.worker';

interface ICell {
  file: ClientFile;
  mounted: boolean;
  uiStore: UiStore;
  // Will use the original image instead of the thumbnail
  forceNoThumbnail?: boolean;
}

export const ListCell = observer(({ file, mounted, uiStore }: ICell) => (
  <div role="gridcell" tabIndex={-1} aria-selected={uiStore.fileSelection.has(file)}>
    <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
      <Thumbnail uiStore={uiStore} mounted={!mounted} file={file} />
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
    {file.tags.size == 0 || !mounted ? <span className="thumbnail-tags" /> : <Tags file={file} />}
  </div>
));

interface IGridCell extends ICell {
  colIndex: number;
  fileStore: FileStore;
}

export const GridCell = observer(({ file, colIndex, mounted, uiStore, fileStore }: IGridCell) => (
  <div
    role="gridcell"
    tabIndex={-1}
    aria-colindex={colIndex}
    aria-selected={uiStore.fileSelection.has(file)}
  >
    <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
      <Thumbnail uiStore={uiStore} mounted={!mounted} file={file} />
    </div>
    {file.isBroken === true && (
      <Tooltip
        content="This image could not be found."
        trigger={
          <span className="thumbnail-broken-overlay" onClick={fileStore.fetchMissingFiles}>
            {IconSet.WARNING_BROKEN_LINK}
          </span>
        }
      />
    )}
    {/* Show tags when the option is enabled, or when the file is selected */}
    {(uiStore.isThumbnailTagOverlayEnabled || uiStore.fileSelection.has(file)) &&
      (file.tags.size == 0 || !mounted ? (
        <span className="thumbnail-tags" />
      ) : (
        <Tags file={file} />
      ))}
  </div>
));

interface IMasonryCell extends ICell {
  index: number;
  fileStore: FileStore;
  forceNoThumbnail: boolean;
  transform: ITransform;
}

export const MasonryCell = observer(
  ({
    file,
    mounted,
    index,
    uiStore,
    fileStore,
    forceNoThumbnail,
    transform: { height, width, left, top },
  }: IMasonryCell & React.HTMLAttributes<HTMLDivElement>) => {
    const style = { height, width, transform: `translate(${left}px,${top}px)` };
    return (
      <div
        data-masonrycell
        data-fileindex={index}
        tabIndex={-1}
        aria-selected={uiStore.fileSelection.has(file)}
        style={style}
      >
        <div className={`thumbnail${file.isBroken ? ' thumbnail-broken' : ''}`}>
          <Thumbnail
            uiStore={uiStore}
            mounted={!mounted}
            file={file}
            forceNoThumbnail={forceNoThumbnail}
          />
        </div>
        {file.isBroken === true && (
          <Tooltip
            content="This image could not be found."
            trigger={
              <span className="thumbnail-broken-overlay" onClick={fileStore.fetchMissingFiles}>
                {IconSet.WARNING_BROKEN_LINK}
              </span>
            }
          />
        )}
        {/* Show tags when the option is enabled, or when the file is selected */}
        {(uiStore.isThumbnailTagOverlayEnabled || uiStore.fileSelection.has(file)) &&
          (file.tags.size == 0 || !mounted ? (
            <span className="thumbnail-tags" />
          ) : (
            <Tags file={file} />
          ))}
      </div>
    );
  },
);

const enum ThumbnailState {
  Ok,
  Loading,
  Error,
}

// TODO: When a filename contains https://x/y/z.abc?323 etc., it can't be found
// e.g. %2F should be %252F on filesystems. Something to do with decodeURI, but seems like only on the filename - not the whole path
const Thumbnail = observer(({ file, mounted, uiStore, forceNoThumbnail }: ICell) => {
  const { thumbnailDirectory } = uiStore;
  const { thumbnailPath, isBroken } = file;

  // Initially, we assume the thumbnail exists
  const [state, setState] = useState(ThumbnailState.Ok);

  // This will check whether a thumbnail exists, generate it if needed
  useEffect(() => {
    let isMounted = true;
    if (!mounted && isBroken === true) {
      return;
    }
    ensureThumbnail(file, thumbnailDirectory)
      .then((exists) => {
        if (isMounted && exists) {
          setState(ThumbnailState.Ok);
        } else if (isBroken !== true && isMounted) {
          setState(ThumbnailState.Loading);
        } else if (isMounted) {
          setState(ThumbnailState.Error);
        }
      })
      .catch(() => setState(ThumbnailState.Error));

    return () => {
      isMounted = false;
    };
  }, [file, isBroken, mounted, thumbnailDirectory]);

  // The thumbnailPath of an image is always set, but may not exist yet.
  // When the thumbnail is finished generating, the path will be changed to `${thumbnailPath}?v=1`,
  // which we detect here to know the thumbnail is ready
  useEffect(() => {
    if (!mounted && thumbnailPath.endsWith('?v=1')) {
      setState(ThumbnailState.Ok);
    }
  }, [thumbnailPath, mounted]);

  if (state === ThumbnailState.Ok) {
    // When the thumbnail cannot be loaded, display an error
    const handleImageError = () => {
      console.log('Could not load image:', thumbnailPath);
      setState(ThumbnailState.Error);
    };
    return (
      <img
        src={forceNoThumbnail ? file.absolutePath : thumbnailPath}
        onError={handleImageError}
        alt=""
      />
    );
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

const Tags = observer(({ file }: { file: ClientFile }) => (
  <span className="thumbnail-tags">
    {Array.from(file.tags, (tag) => (
      <Tag key={tag.id} text={tag.name} color={tag.viewColor} />
    ))}
  </span>
));
