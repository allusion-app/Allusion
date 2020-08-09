declare module '*.scss';
declare module '*.svg' {
  import React = require('react');
  export const ReactComponent: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;
  const src: string;
  export default src;
}
declare module '*.png' {
  const content: any;
  export default content;
}
declare module '*.jpg' {
  const content: any;
  export default content;
}
declare module '*.gif' {
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
