export type ITransform = Readonly<[width: number, height: number, top: number, left: number]>;

export interface Layouter {
  getTransform: (index: number) => ITransform;
}

/**
 * Performs a binary search that finds the index of the first (or last) image at a specified height.
 * Assumes images are ordered linearly in top-offset. This is not always the case (vertical masonry),
 * but should be close enough, in combination with rendering a little more than what's in the viewport.
 * @param height The query height
 * @param length The amount of images
 * @param layout The layout of the images
 * @param overshoot Whether to overshoot: return the first or last image at the specified height
 */
export function findViewportEdge(height: number, length: number, layout: Layouter): number {
  // easy base case
  if (height <= 0) {
    return 0;
  }

  // TODO: Could exploit the assumption that the images are ordered linearly in top-offset,
  // by making the initial guess at height/maxHeight
  // Alternatively, instead of searching at runtime, preprocess top-offsets of images
  // in an O(1) look-up table when the layout is (re)computed

  let iteration = 1;
  let nextLookup = Math.round(length / 2);
  while (true) {
    iteration++;
    let stepSize = length / Math.pow(2, iteration);
    if (stepSize < 1) {
      return nextLookup;
    }
    stepSize = Math.round(stepSize);
    const [, tHeight, tTop] = layout.getTransform(nextLookup);
    if (tTop > height) {
      if (tTop + tHeight > height) {
        // looked up too far, go back:
        nextLookup -= stepSize;
      } else {
        // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      }
    } else {
      if (tTop + tHeight > height) {
        // TODO: this image is intersecting with the target heigth: check whether to over/undershoot
        return nextLookup;
      } else {
        nextLookup += stepSize;
      }
    }
  }
}
