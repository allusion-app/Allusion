import { ClientFile } from '../../entities/File';
import { ThumbnailSize } from '../../stores/UiStore';

export type ContentRect = { width: number; height: number };

export interface GalleryProps {
  contentRect: ContentRect;
  /** The index of the currently selected image, or the "last selected" image when a range is selected */
  lastSelectionIndex: React.MutableRefObject<number | undefined>;
  select: (file: ClientFile, selectAdditive: boolean, selectRange: boolean) => void;
}

const PADDING = 8;
const CELL_SIZE_SMALL = 160 + PADDING;
const CELL_SIZE_MEDIUM = 240 + PADDING;
const CELL_SIZE_LARGE = 320 + PADDING;

export function getThumbnailSize(sizeType: ThumbnailSize) {
  if (typeof sizeType === 'number') {
    return sizeType;
  }
  if (sizeType === 'small') {
    return CELL_SIZE_SMALL;
  } else if (sizeType === 'medium') {
    return CELL_SIZE_MEDIUM;
  }
  return CELL_SIZE_LARGE;
}
