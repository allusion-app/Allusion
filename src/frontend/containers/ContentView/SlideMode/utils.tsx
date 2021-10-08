/**
 * Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan/tree/bc2b997febae37327ac5696433712371332645af/src
 * MIT license, see LICENSE file
 */

import { clamp } from 'src/frontend/utils';

export type Dimension = [width: number, height: number];

export type Vec2 = [x: number, y: number];

export interface Transform {
  top: number;
  left: number;
  scale: number;
}

export type Overflow = [top: number, left: number, right: number, bottom: number];

export interface ClientPosition {
  clientX: number;
  clientY: number;
}

// Constructor functions are there to prevent creating new object shapes. This
// happens when property order or types are changed. Which means performance
// will suffer in one way or another.

export function createDimension(width: number, height: number): Dimension {
  return [width, height];
}

export function createVec2(x: number, y: number): Vec2 {
  return [x, y];
}

export function createTransform(top: number, left: number, scale: number): Transform {
  return { top, left, scale };
}

export const getRelativePosition = (
  { clientX, clientY }: ClientPosition,
  relativeToElement: Element,
): Vec2 => {
  const rect = relativeToElement.getBoundingClientRect();
  return createVec2(clientX - rect.left, clientY - rect.top);
};

export const getPinchMidpoint = ([pos1, pos2]: [ClientPosition, ClientPosition]): Vec2 =>
  createVec2((pos1.clientX + pos2.clientX) / 2, (pos1.clientY + pos2.clientY) / 2);

export const getPinchLength = ([pos1, pos2]: [ClientPosition, ClientPosition]): number => {
  const dx = pos1.clientY - pos2.clientY;
  const dy = pos1.clientX - pos2.clientX;
  return Math.sqrt(dx * dx + dy * dy);
};

export const isEqualDimension = ([w1, h1]: Dimension, [w2, h2]: Dimension): boolean => {
  return w1 === w2 && h1 === h2;
};

export const isEqualTransform = (transform1: Transform, transform2: Transform): boolean => {
  return (
    isClose(transform1.top, transform2.top, 0.05) &&
    isClose(transform1.left, transform2.left, 0.05) &&
    isClose(transform1.scale, transform2.scale, 0.0005)
  );
};

function isClose(a: number, b: number, tolerance: number) {
  return Math.abs(a - b) < tolerance;
}

export const getAutofitScale = (
  [containerWidth, containerHeight]: Dimension,
  [imageWidth, imageHeight]: Dimension,
): number => {
  if (imageWidth <= 0 || imageHeight <= 0) {
    return 1;
  }
  return Math.min(containerWidth / imageWidth, containerHeight / imageHeight, 1);
};

export const tryPreventDefault = (event: Event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

export const getImageOverflow = (
  top: number,
  left: number,
  scale: number,
  [imageWidth, imageHeight]: Dimension,
  [containerWidth, containerHeight]: Dimension,
): Overflow => {
  return [
    Math.max(-top, 0),
    Math.max(-left, 0),
    calculateOverflow(left, scale, imageWidth, containerWidth),
    calculateOverflow(top, scale, imageHeight, containerHeight),
  ];
};

function calculateOverflow(x: number, scale: number, image: number, container: number): number {
  const overflow = Math.max(0, scale * image - container);
  return overflow === 0 ? overflow + x : overflow;
}

// Returns constrained scale when requested scale is outside min/max with tolerance, otherwise returns requested scale
export function getConstrainedScale(
  requestedScale: number,
  minScale: number,
  maxScale: number,
  tolerance: number,
) {
  const lowerBoundFactor = 1.0 - tolerance;
  const upperBoundFactor = 1.0 + tolerance;
  return clamp(requestedScale, minScale * lowerBoundFactor, maxScale * upperBoundFactor);
}
