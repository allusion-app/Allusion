import { encodeFilePath } from './utils';

describe('utils', () => {
  describe('encodeFilePath', () => {
    it('should encode simple paths correctly (unaffected)', () => {
      expect(encodeFilePath('C:\\test\\test.jpg')).toEqual('C:\\test\\test.jpg');
    });
    it('should encode weird paths correctly (unaffected)', () => {
      expect(encodeFilePath('C:/Images/https_%2F%2Fcdn/my-image.jpg')).toEqual(
        'C:/Images/https_%2F%2Fcdn/my-image.jpg',
      );
    });
    it('should encode weird filenames correctly', () => {
      expect(encodeFilePath('C:\\test\\test space.jpg')).toEqual('C:\\test\\test%20space.jpg');
    });
    it('should encode paths with params correctly', () => {
      expect(encodeFilePath('C:\\test\\test.jpg?v=1')).toEqual('C:\\test\\test.jpg?v=1');
    });
  });
});
