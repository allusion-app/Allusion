import { observer } from 'mobx-react-lite';
import {
  CellMeasurer, CellMeasurerCache, createMasonryCellPositioner, Masonry, MasonryCellProps, WindowScroller,
} from 'react-virtualized';
// @ts-ignore
import ImageMeasurer from 'react-virtualized-image-measurer';
import { IGalleryLayoutProps, getThumbnailSize } from './Gallery';
import { useMemo, useCallback } from 'react';
import React from 'react';
import { ClientFile } from '../../entities/File';

// Default sizes help Masonry decide how many images to batch-measure
const cache = new CellMeasurerCache({
  defaultHeight: 200,
  defaultWidth: 200,
  fixedWidth: true,
});

// interface IItemsWithSizesProps {
//   itemsWithSizes: [{ item: ClientFile, size: { width: number, height: number }}];
// }

interface IMasonryLayoutProps extends IGalleryLayoutProps {}

const MasonryLayout = (
  { contentWidth, contentHeight, fileList, uiStore, handleClick, handleDrop }: IMasonryLayoutProps) => {
  const cellSize = getThumbnailSize(uiStore.thumbnailSize);
  const numColumns = Math.floor(contentWidth / cellSize);

  const cellPositioner = useMemo(() => createMasonryCellPositioner({
    cellMeasurerCache: cache,
    columnCount: 3,
    columnWidth: cellSize,
    spacer: 10,
  }), [cellSize, numColumns]);

  console.log(cellSize, numColumns);

  const cellRenderer = useCallback(({ index, isScrolling, key, parent, style }: MasonryCellProps) => {
    const file = fileList[index];
    // const height = cellSize * (size.height / size.width) || cache.defaultHeight;

    return (
      <CellMeasurer
        cache={cache}
        index={index}
        key={key}
        parent={parent}
      >
        {({ measure }) => (
          <div style={{ ...style }}>
            <span>key</span>
            {/* <GalleryItem
              file={file}
              isSelected={uiStore.fileSelection.includes(file.id)}
              onRemoveTag={(tag) => file.removeTag(tag.id)}
              onSelect={(f) => uiStore.selectFile(f)}
              onOpen={(f) => console.log('Open file ', f)}
              onDeselect={(f) => uiStore.deselectFile(f)}
              onDrop={(tag) => file.addTag(tag.id)}
            /> */}
            <img
              src={file.path}
              width={style && style.width}
              height={style && style.height}
              onLoad={measure}
            />
          </div>
        )}
      </CellMeasurer>
    );
  }, []);

  return (
    // <div style={{ height: contentHeight, width: contentWidth }}>
      <Masonry
        cellCount={fileList.length}
        cellMeasurerCache={cache}
        cellPositioner={cellPositioner}
        cellRenderer={cellRenderer}
        keyMapper={(index) => fileList[index].id}
        autoHeight
        width={contentWidth}
        height={contentHeight}
        onScroll={(x) => console.log(x)}
        // scrollTop={scrollTop}
        overscanByPixels={200}
      />
      // </div>
  );
};

const Wrapper = (props: IGalleryLayoutProps) => {
  return (
    // <ImageMeasurer
    //   items={props.fileList}
    //   image={(item: ClientFile) => item.path}
    //   defaultHeight={cache.defaultWidth}
    //   defaultWidth={cache.defaultHeight}
    //   onError={(error: any, item: any, src: string) => {
    //     console.error(`Cannot load image ${src}`, error);
    //   }}
    // >
    //   {({ itemsWithSizes }: IItemsWithSizesProps) => (
    //     <MasonryLayout itemsWithSizes={itemsWithSizes} {...props} />
    //   )}
    // </ImageMeasurer>
    <MasonryLayout {...props} />
  );
};

export default observer(Wrapper);
