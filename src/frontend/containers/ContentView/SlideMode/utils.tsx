/**
 * Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan/tree/bc2b997febae37327ac5696433712371332645af/src
 * MIT license yada yada
 */

import { createSelector } from 'reselect';
import { IPinchZoomPanProps, IPinchZoomPanState } from './ZoomPan';

export interface IDimensions {
  width: number;
  height: number;
}

export interface IVec2 {
  x: number;
  y: number;
}

export interface ITransform {
  top: number;
  left: number;
  scale: number;
}

export const snapToTarget = (value: number, target: number, tolerance: number) => {
  const withinRange = Math.abs(target - value) < tolerance;
  return withinRange ? target : value;
};

export const constrain = (lowerBound: number, upperBound: number, value: number) =>
  Math.min(upperBound, Math.max(lowerBound, value));

export const negate = (value: number) => value * -1;

export const getRelativePosition = (
  { clientX, clientY }: MouseEvent | Touch,
  relativeToElement: { getBoundingClientRect: () => any },
) => {
  const rect = relativeToElement.getBoundingClientRect();
  return {
    x: clientX - rect.left,
    y: clientY - rect.top,
  };
};

export const getPinchMidpoint = ([touch1, touch2]: any) => ({
  x: (touch1.clientX + touch2.clientX) / 2,
  y: (touch1.clientY + touch2.clientY) / 2,
});

export const getPinchLength = ([touch1, touch2]: any) =>
  Math.sqrt(
    Math.pow(touch1.clientY - touch2.clientY, 2) + Math.pow(touch1.clientX - touch2.clientX, 2),
  );

export function setRef(ref: any, value: any) {
  if (typeof ref === 'function') {
    ref(value);
  } else if (ref) {
    ref.current = value;
  }
}

export const isEqualDimensions = (dimensions1?: IDimensions, dimensions2?: IDimensions) => {
  if ((dimensions1 === dimensions2) === undefined) {
    return true;
  }
  if (dimensions1 === undefined || dimensions2 === undefined) {
    return false;
  }
  return dimensions1.width === dimensions2.width && dimensions1.height === dimensions2.height;
};

export const getDimensions = (object: any): IDimensions | undefined => {
  if (object === undefined) {
    return undefined;
  }
  return {
    width: object.offsetWidth || object.width,
    height: object.offsetHeight || object.height,
  };
};

export const getContainerDimensions = (image: any) => {
  return {
    width: image.parentNode.offsetWidth,
    height: image.parentNode.offsetHeight,
  };
};

export const isEqualTransform = (transform1: ITransform, transform2: ITransform) => {
  if ((transform1 === transform2) === undefined) {
    return true;
  }
  if (transform1 === undefined || transform2 === undefined) {
    return false;
  }
  return (
    round(transform1.top, 5) === round(transform2.top, 5) &&
    round(transform1.left, 5) === round(transform2.left, 5) &&
    round(transform1.scale, 5) === round(transform2.scale, 5)
  );
};

export const getAutofitScale = (containerDimensions: IDimensions, imageDimensions: IDimensions) => {
  const { width: imageWidth, height: imageHeight } = imageDimensions || {};
  if (!(imageWidth > 0 && imageHeight > 0)) {
    return 1;
  }
  return Math.min(
    containerDimensions.width / imageWidth,
    containerDimensions.height / imageHeight,
    1,
  );
};

export const getMinScale = createSelector(
  (state: IPinchZoomPanState) => state.containerDimensions,
  (state: IPinchZoomPanState) => state.imageDimensions,
  (state: IPinchZoomPanState, props: IPinchZoomPanProps) => props.minScale,
  (containerDimensions, imageDimensions, minScaleProp) =>
    String(minScaleProp).toLowerCase() === 'auto'
      ? getAutofitScale(containerDimensions, imageDimensions)
      : minScaleProp || 1,
);

function round(number: number, precision?: number) {
  if (precision && number !== null && number !== undefined) {
    // Shift with exponential notation to avoid floating-point issues.
    // See [MDN](https://mdn.io/round#Examples) for more details.
    let pair = (String(number) + 'e').split('e');
    const value = Math.round(Number(`${pair[0]}e${+pair[1] + precision}`));

    pair = (String(value) + 'e').split('e');
    return +(pair[0] + 'e' + (+pair[1] - precision));
  }
  return Math.round(number);
}

export const tryCancelEvent = (event: Event) => {
  if (event.cancelable === false) {
    return false;
  }

  event.preventDefault();
  return true;
};

function calculateOverflowLeft(left: number) {
  const overflow = negate(left);
  return overflow > 0 ? overflow : 0;
}

function calculateOverflowTop(top: number) {
  const overflow = negate(top);
  return overflow > 0 ? overflow : 0;
}

function calculateOverflowRight(
  left: number,
  scale: number,
  imageDimensions: IDimensions,
  containerDimensions: IDimensions,
) {
  const overflow = Math.max(0, scale * imageDimensions.width - containerDimensions.width);
  return overflow > 0 ? overflow - negate(left) : 0;
}

function calculateOverflowBottom(
  top: number,
  scale: number,
  imageDimensions: IDimensions,
  containerDimensions: IDimensions,
) {
  const overflow = Math.max(0, scale * imageDimensions.height - containerDimensions.height);
  return overflow > 0 ? overflow - negate(top) : 0;
}

export const getImageOverflow = (
  top: number,
  left: number,
  scale: number,
  imageDimensions: IDimensions,
  containerDimensions: IDimensions,
) => {
  return {
    top: calculateOverflowTop(top),
    right: calculateOverflowRight(left, scale, imageDimensions, containerDimensions),
    bottom: calculateOverflowBottom(top, scale, imageDimensions, containerDimensions),
    left: calculateOverflowLeft(left),
  };
};
