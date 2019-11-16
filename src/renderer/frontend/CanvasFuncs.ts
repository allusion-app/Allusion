
interface IRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

// Some 2D rectangle packing algorithms:
// https://web.archive.org/web/20170109223003/http://clb.demon.fi/files/RectangleBinPack.pdf

// Todo: How to take into account when only arranging some of all rectangles in the scene.
// e.g. how to prevent overlap? some of the rectangles can have a "fixed" location 

/**
 * Returns the input rects spatially laid out in an optimal manner.
 * @param rects Input rectangles
 */
export function arrangeOptimize(rects: IRect[]): IRect[] {
  const res: IRect[] = [];

  return res;
}

/**
 * Returns the input rects spatially laid out in the order they are specified as the input argument.
 * Could be implemented with the "Shelf Next Fit" algorithm
 * @param rects Input rectangles
 */
export function arrangeSorted(rects: IRect[]) {

}
