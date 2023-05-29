import {
  findViewportEdge,
  Layouter,
} from '../src/frontend/containers/ContentView/Masonry/layout-helpers';

// Simple linear layout: One image per row
const linearLayout: Layouter = {
  // first image [0, 10], second [10, 20], third: [20, 30], ...
  getTransform: (i) => [10, 10, i * 10, 0],
};

// Multiple images per row, with different heights
const dynamicLayout: Layouter = {
  // first image [0, 10], second [10, 20], third: [20, 30], ...
  getTransform: (i) => [10, 10, Math.floor(i / 4) * 10 + i, (i % 4) * 10],
};

describe('masonry > renderer', () => {
  describe('binarySearch', () => {
    describe('linear layout', () => {
      it('should return 0 when viewport is at the top', () => {
        const index = findViewportEdge(0, 10, linearLayout);
        expect(index).toBe(0);
      });
      it('should correctly find the second image at height 15', () => {
        const index = findViewportEdge(15, 10, linearLayout);
        expect(index).toBe(1);
      });
      it('should correctly find the last image at max height', () => {
        const index = findViewportEdge(999, 10, linearLayout);
        expect(index).toBe(9);
      });
    });
    describe('dynamic layout', () => {
      it('should return 0 when viewport is at the top', () => {
        const index = findViewportEdge(0, 10, dynamicLayout);
        expect(index).toBe(0);
      });
      // TODO: More tests, after implementing over/under-shooting
    });
  });
});
