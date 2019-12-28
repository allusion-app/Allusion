// Allow importing of svg files
declare module '*.svg' {
  const content: any;
  export default content;
}
declare module '*.png' {
  const content: any;
  export default content;
}
declare module '*.ico' {
  const content: any;
  export default content;
}

// Web worker support
declare module 'worker-loader!*' {
  class WebpackWorker extends Worker {
    constructor();
  }

  export default WebpackWorker;
}

declare module 'react-responsive-pinch-zoom-pan' {
  const PinchZoomPan: any;
  export default PinchZoomPan;
}
