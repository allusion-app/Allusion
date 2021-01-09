import { binarySearch, Layouter } from './renderer';

// Simple linear layout: One image per row
const linearLayout: Layouter = {
  getItemLayout: (i) => ({
    top: i * 10, // first image [0, 10], second [10, 20], third: [20, 30], ...
    left: 0,
    height: 10,
    width: 10,
  })
};

// Multiple images per row, with different heights
const dynamicLayout: Layouter = {
  getItemLayout: (i) => ({
    top: Math.floor(i / 4) * 10 + i, // first image [0, 10], second [10, 20], third: [20, 30], ...
    left: (i % 4) * 10,
    height: 10,
    width: 10,
  })
};

describe('masonry > renderer', () => {
  describe('binarySearch', () => {
    describe('linear layout', () => {
      it('should return 0 when viewport is at the top', () => {
        const index = binarySearch(0, 10, linearLayout, false);
        expect(index).toBe(0);
      });
      it('should correctly find the second image at height 15', () => {
        const index = binarySearch(15, 10, linearLayout, false);
        expect(index).toBe(1);
      });
      it('should correctly find the last image at max height', () => {
        const index = binarySearch(999, 10, linearLayout, false);
        expect(index).toBe(9);
      });
    });
    describe('dynamic layout', () => {

    });
  });
})
