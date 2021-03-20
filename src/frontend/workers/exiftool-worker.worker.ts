import { expose } from 'comlink';
import ExifIO from '../../backend/ExifIO';

// TODO: not sure how much a webworker helps for node-exiftool
// but I can image there is some overhead for reading/writing IO

// https://lorefnon.tech/2019/03/24/using-comlink-with-typescript-and-worker-loader/
expose(ExifIO, self);

export default null as any;
