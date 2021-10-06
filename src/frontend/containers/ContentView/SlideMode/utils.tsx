/**
 * Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan/tree/bc2b997febae37327ac5696433712371332645af/src
 * MIT license, see LICENSE file
 */

export interface Dimension {
  width: number;
  height: number;
}

export interface Vec2 {
  x: number;
  y: number;
}

export interface Transform {
  top: number;
  left: number;
  scale: number;
}

export interface Overflow {
  top: number;
  left: number;
  right: number;
  bottom: number;
}

interface ClientPosition {
  clientX: number;
  clientY: number;
}

// Constructor functions are there to prevent creating new object shapes. This
// happens when property order or types are changed. Which means performance
// will suffer in one way or another.

export function createDimension(width: number, height: number): Dimension {
  return { width, height };
}

export function createVec2(x: number, y: number): Vec2 {
  return { x, y };
}

export function createTransform(top: number, left: number, scale: number): Transform {
  return { top, left, scale };
}

export const snapToTarget = (value: number, target: number, tolerance: number): number => {
  const withinRange = Math.abs(target - value) < tolerance;
  return withinRange ? target : value;
};

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

export const isEqualDimension = (dimensions1: Dimension, dimensions2: Dimension): boolean => {
  return dimensions1.width === dimensions2.width && dimensions1.height === dimensions2.height;
};

export const isEqualTransform = (transform1: Transform, transform2: Transform): boolean => {
  return (
    round(transform1.top) === round(transform2.top) &&
    round(transform1.left) === round(transform2.left) &&
    round(transform1.scale) === round(transform2.scale)
  );
};

export const getAutofitScale = (container: Dimension, image: Dimension): number => {
  const { width, height } = image;
  if (width <= 0 || height <= 0) {
    return 1;
  }
  return Math.min(container.width / width, container.height / height, 1);
};

function round(number: number): number {
  return Number.parseFloat(number.toPrecision(5));
}

export const tryCancelEvent = (event: Event) => {
  if (event.cancelable) {
    event.preventDefault();
  }
};

export const getImageOverflow = (
  top: number,
  left: number,
  scale: number,
  image: Dimension,
  container: Dimension,
): Overflow => {
  return {
    top: Math.max(-top, 0),
    left: Math.max(-left, 0),
    right: calculateOverflow(left, scale, image.width, container.width),
    bottom: calculateOverflow(top, scale, image.height, container.height),
  };
};

function calculateOverflow(x: number, scale: number, image: number, container: number): number {
  const overflow = Math.max(0, scale * image - container);
  return overflow === 0 ? overflow + x : overflow;
}
