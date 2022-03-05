import { encodeFilePath } from 'common/fs';

describe('utils', () => {
  describe('encodeFilePath', () => {
    it('should encode simple paths correctly (unaffected)', () => {
      expect(encodeFilePath('C:/test/test.jpg')).toEqual('file://C:/test/test.jpg');
    });
    it('should encode weird paths correctly (unaffected)', () => {
      expect(encodeFilePath('C:/Images/https_%2F%2Fcdn/my-image.jpg')).toEqual(
        'file://C:/Images/https_%2F%2Fcdn/my-image.jpg',
      );
    });
    it('should encode filenames with spaces correctly', () => {
      expect(encodeFilePath('C:/test/test space.jpg')).toEqual('file://C:/test/test%20space.jpg');
    });
    it('should encode paths with params correctly', () => {
      expect(encodeFilePath('C:/test/test.jpg?v=1')).toEqual('file://C:/test/test.jpg?v=1');
    });
    it('should encode paths with octothorp (#) correctly', () => {
      // Filename
      expect(encodeFilePath('C:/test/test#.jpg')).toEqual('file://C:/test/test%23.jpg');
      // Also in path
      expect(encodeFilePath('C:/test#/test.jpg')).toEqual('file://C:/test#/test%23.jpg');
    });
  });
});
