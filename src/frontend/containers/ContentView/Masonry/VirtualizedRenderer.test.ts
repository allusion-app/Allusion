import { findViewportEdge, Layouter } from './layout-helpers';

// Simple linear layout: One image per row
const linearLayout: Layouter = {
  getTransform: (i) => ({
    top: i * 10, // first image [0, 10], second [10, 20], third: [20, 30], ...
    left: 0,
    height: 10,
    width: 10,
  }),
};

// Multiple images per row, with different heights
const dynamicLayout: Layouter = {
  getTransform: (i) => ({
    top: Math.floor(i / 4) * 10 + i, // first image [0, 10], second [10, 20], third: [20, 30], ...
    left: (i % 4) * 10,
    height: 10,
    width: 10,
  }),
};

describe('masonry > renderer', () => {
  describe('binarySearch', () => {
    describe('linear layout', () => {
      it('should return 0 when viewport is at the top', () => {
        const index = findViewportEdge(0, 10, linearLayout, false);
        expect(index).toBe(0);
      });
      it('should correctly find the second image at height 15', () => {
        const index = findViewportEdge(15, 10, linearLayout, false);
        expect(index).toBe(1);
      });
      it('should correctly find the last image at max height', () => {
        const index = findViewportEdge(999, 10, linearLayout, false);
        expect(index).toBe(9);
      });
    });
    describe('dynamic layout', () => {
      it('should return 0 when viewport is at the top', () => {
        const index = findViewportEdge(0, 10, dynamicLayout, false);
        expect(index).toBe(0);
      });
      // TODO: More tests, after implementing over/under-shooting
    });
  });
});
