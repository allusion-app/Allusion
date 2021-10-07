/**
 * Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan/tree/bc2b997febae37327ac5696433712371332645af/src
 * MIT license, see LICENSE file
 */

import React from 'react';
import { createSelector } from 'reselect';
import { clamp } from 'src/frontend/utils';

import {
  snapToTarget,
  getPinchLength,
  getPinchMidpoint,
  getRelativePosition,
  isEqualDimension,
  isEqualTransform,
  getAutofitScale,
  tryCancelEvent,
  getImageOverflow,
  Dimension,
  Vec2,
  Transform,
  createTransform,
  createVec2,
  createDimension,
} from './utils';

const OVERZOOM_TOLERANCE = 0.05;
const DOUBLE_TAP_THRESHOLD = 250;
const ANIMATION_SPEED = 0.1;

export type SlideTransform = Transform;

export interface ZoomPanProps {
  children: React.ReactElement<HTMLImageElement>;
  initialScale: number | 'auto';
  minScale: number;
  maxScale: number;
  position: 'topLeft' | 'center';
  doubleTapBehavior: 'reset' | 'zoom' | 'zoomOrReset' | 'close';
  imageDimension: Dimension;
  containerDimension: Dimension;
  onClose?: () => void;
  debug?: boolean;

  transitionStart?: Transform;
  transitionEnd?: Transform;
}

export type ZoomPanState = Transform;

//Ensure the image is not over-panned, and not over- or under-scaled.
//These constraints must be checked when image changes, and when container is resized.
export default class ZoomPan extends React.Component<ZoomPanProps, ZoomPanState> {
  lastPointerUpTimeStamp: number | undefined = undefined; //enables detecting double-tap
  lastPanPointerPosition: Vec2 | undefined = undefined; //helps determine how far to pan the image
  lastPinchLength: number | undefined; //helps determine if we are pinching in or out
  animation: (() => void) | undefined = undefined; //current animation handle
  containerRef = React.createRef<HTMLDivElement>();

  constructor(props: ZoomPanProps) {
    super(props);
    this.state = { ...(props.transitionStart ?? createTransform(0, 0, 0)) };
    this.setState = this.setState.bind(this);
  }

  private get container(): HTMLDivElement {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.containerRef.current!;
  }

  //event handlers
  handleTouchStart = (event: TouchEvent) => {
    this.cancelAnimation();

    const touches = event.touches;
    if (touches.length === 2) {
      this.lastPinchLength = getPinchLength([touches[0], touches[1]]);
      this.lastPanPointerPosition = undefined;
    } else if (touches.length === 1) {
      this.lastPinchLength = undefined;
      this.pointerDown(touches[0]);
      tryCancelEvent(event); //suppress mouse events
    }
  };

  handleTouchMove = (event: TouchEvent) => {
    const touches = event.touches;
    if (touches.length === 2) {
      this.pinchChange([touches[0], touches[1]]);

      //suppress viewport scaling on iOS
      tryCancelEvent(event);
    } else if (touches.length === 1) {
      this.pan(touches[0]);
    }
  };

  handleTouchEnd = (event: TouchEvent) => {
    this.cancelAnimation();
    if (event.touches.length === 0 && event.changedTouches.length === 1) {
      if (
        this.lastPointerUpTimeStamp &&
        this.lastPointerUpTimeStamp + DOUBLE_TAP_THRESHOLD > event.timeStamp
      ) {
        const pointerPosition = getRelativePosition(event.changedTouches[0], this.container);
        this.doubleClick(pointerPosition);
      }
      this.lastPointerUpTimeStamp = event.timeStamp;
      tryCancelEvent(event); //suppress mouse events
    }

    //We allow transient +/-5% over-pinching.
    //Animate the bounce back to constraints if applicable.
    this.maybeAdjustCurrentTransform(ANIMATION_SPEED);
  };

  handleMouseDown = (event: MouseEvent) => {
    this.cancelAnimation();
    this.pointerDown(event);
  };

  handleMouseMove = (event: MouseEvent) => {
    if (!event.buttons) return null;
    this.pan(event);
  };

  handleMouseDoubleClick = (event: MouseEvent) => {
    this.cancelAnimation();
    const pointerPosition = getRelativePosition(event, this.container);
    this.doubleClick(pointerPosition);
  };

  handleMouseWheel = (event: WheelEvent) => {
    this.cancelAnimation();
    const point = getRelativePosition(event, this.container);
    if (event.deltaY > 0) {
      if (this.state.scale > getMinScale(this.props)) {
        this.zoomOut(point);
        tryCancelEvent(event);
      }
    } else if (event.deltaY < 0) {
      if (this.state.scale < this.props.maxScale) {
        this.zoomIn(point, 0, 0.1);
        tryCancelEvent(event);
      }
    }
  };

  handleZoomInClick = () => {
    this.cancelAnimation();
    this.zoomIn(
      createVec2(this.props.containerDimension.width / 2, this.props.containerDimension.height / 2),
      0,
      0.1,
    );
  };

  handleZoomOutClick = () => {
    this.cancelAnimation();
    this.zoomOut(
      createVec2(this.props.containerDimension.width / 2, this.props.containerDimension.height / 2),
    );
  };

  //actions
  pointerDown(clientPosition: Touch | MouseEvent) {
    this.lastPanPointerPosition = getRelativePosition(clientPosition, this.container);
  }

  pan(pointerClientPosition: MouseEvent | Touch): void {
    if (!this.lastPanPointerPosition) {
      //if we were pinching and lifted a finger
      this.pointerDown(pointerClientPosition);
      return;
    }

    const pointerPosition = getRelativePosition(pointerClientPosition, this.container);
    const translateX = pointerPosition.x - this.lastPanPointerPosition.x;
    const translateY = pointerPosition.y - this.lastPanPointerPosition.y;
    this.lastPanPointerPosition = pointerPosition;

    const top = this.state.top + translateY;
    const left = this.state.left + translateX;
    const requestedTransform = createTransform(top, left, this.state.scale);
    constrainAndApplyTransform(this.props, requestedTransform, 0, 0, this.setState);
  }

  doubleClick(pointerPosition: Vec2) {
    const { doubleTapBehavior, onClose } = this.props;
    if (doubleTapBehavior === 'close') {
      return onClose?.();
    }
    if (
      doubleTapBehavior === 'zoom' &&
      this.state.scale * (1 + OVERZOOM_TOLERANCE) < this.props.maxScale
    ) {
      return this.zoomIn(pointerPosition, ANIMATION_SPEED, 1);
    }
    if (doubleTapBehavior === 'reset') {
      this.applyInitialTransform(ANIMATION_SPEED);
    }
    if (doubleTapBehavior === 'zoomOrReset') {
      const initialScale = getAutofitScale(
        this.props.containerDimension,
        this.props.imageDimension,
      );
      // If current scale is same as initial scale, zoom in, otherwise reset to initial zoom
      Math.abs(this.state.scale - initialScale) < 0.01
        ? this.zoomIn(pointerPosition, ANIMATION_SPEED, 1)
        : this.applyInitialTransform(ANIMATION_SPEED);
    }
  }

  pinchChange(touches: [Touch, Touch]) {
    const length = getPinchLength(touches);
    const midpoint = getPinchMidpoint(touches);
    const scale = this.lastPinchLength
      ? (this.state.scale * length) / this.lastPinchLength //sometimes we get a touchchange before a touchstart when pinching
      : this.state.scale;

    this.zoom(scale, midpoint, OVERZOOM_TOLERANCE, 0);

    this.lastPinchLength = length;
  }

  zoomIn(midpoint: Vec2, speed: number, factor: number) {
    this.zoom(this.state.scale * (1 + factor), midpoint, 0, speed);
  }

  zoomOut(midpoint: Vec2) {
    this.zoom(this.state.scale * 0.9, midpoint, 0, 0);
  }

  zoom(requestedScale: number, containerRelativePoint: Vec2, tolerance: number, speed: number) {
    const { scale, top, left } = this.state;
    const dx = containerRelativePoint.x - left;
    const dy = containerRelativePoint.y - top;

    const nextScale = getConstrainedScale(this.props, requestedScale, tolerance);
    const incrementalScalePercentage = (nextScale - scale) / scale;
    const translateX = dx * incrementalScalePercentage;
    const translateY = dy * incrementalScalePercentage;

    const nextTop = top - translateY;
    const nextLeft = left - translateX;
    const requestedTransform = createTransform(nextTop, nextLeft, nextScale);
    constrainAndApplyTransform(this.props, requestedTransform, tolerance, speed, this.setState);
  }

  //compare stored dimensions to actual dimensions; capture actual dimensions if different
  handleDimensionsChanged(oldContainer: Dimension, oldImage: Dimension): boolean | undefined {
    const containerDimension = this.props.containerDimension;
    const imageDimension = this.props.imageDimension;

    const imgDimensionsChanged = !isEqualDimension(imageDimension, oldImage);
    const containerDimensionsChanged = !isEqualDimension(containerDimension, oldContainer);
    if (imgDimensionsChanged || containerDimensionsChanged) {
      this.cancelAnimation();

      // Keep image centered when container dimensions change (e.g. closing a side bar)
      const state: ZoomPanState = { ...this.state };
      if (oldContainer.width !== 0 && oldContainer.height !== 0) {
        state.left = state.left - (oldContainer.width - containerDimension.width) / 2;
        state.top = state.top - (oldContainer.height - containerDimension.height) / 2;
      }

      //capture new dimensions
      this.setState(state);
      this.debug(`Dimensions changed: Container: ${containerDimension}, Image: ${imageDimension}`);
      return imgDimensionsChanged;
    }
    return undefined;
  }

  //transformation methods

  //Ensure current transform is within constraints
  maybeAdjustCurrentTransform(speed: number) {
    const correctedTransform = getCorrectedTransform(this.props, this.state, 0);
    if (correctedTransform !== undefined) {
      this.setAnimation(applyTransform(correctedTransform, speed, this.setState));
    }
  }

  applyInitialTransform(speed: number) {
    const requestedTransform = applyInitialTransform(this.props);
    if (requestedTransform !== undefined) {
      this.setAnimation(
        constrainAndApplyTransform(this.props, requestedTransform, 0.5, speed, this.setState),
      );
    }
  }

  //lifecycle methods
  render() {
    const containerStyle = {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: browserPanActions(this.state, this.props),
    };

    return (
      <div ref={this.containerRef} style={containerStyle}>
        {React.cloneElement(this.props.children, {
          onTouchStart: this.handleTouchStart,
          onTouchMove: this.handleTouchMove,
          onTouchEnd: this.handleTouchEnd,
          onMouseDown: this.handleMouseDown,
          onMouseMove: this.handleMouseMove,
          onDoubleClick: this.handleMouseDoubleClick,
          onWheel: this.handleMouseWheel,
          onDragStart: tryCancelEvent,
          onContextMenu: tryCancelEvent,
          style: imageStyle(this.state),
        })}
      </div>
    );
  }

  componentDidMount() {
    const zeroDimension = createDimension(0, 0);
    this.handleDimensionsChanged(zeroDimension, zeroDimension);
    const requestedTransform = applyInitialTransform(this.props);
    if (requestedTransform !== undefined) {
      this.animation = applyTransform(
        requestedTransform,
        this.props.transitionStart !== undefined ? ANIMATION_SPEED * 2 : 0,
        this.setState,
      );
    }
  }

  componentDidUpdate(prevProps: Readonly<ZoomPanProps>) {
    const imgDimensionsChanged = this.handleDimensionsChanged(
      prevProps.containerDimension,
      prevProps.imageDimension,
    );
    if (imgDimensionsChanged === true) {
      this.applyInitialTransform(0);
    } else if (imgDimensionsChanged === false) {
      this.maybeAdjustCurrentTransform(0);
    }
    // Trigger ending transition when transitionEnd prop is passed
    if (this.props.transitionEnd !== undefined) {
      this.setAnimation(
        applyTransform(this.props.transitionEnd, ANIMATION_SPEED / 2, this.setState),
      );
    }
  }

  componentWillUnmount() {
    this.cancelAnimation();
  }

  setAnimation(cancel: (() => void) | undefined) {
    this.animation?.();
    this.animation = cancel;
  }

  cancelAnimation() {
    this.setAnimation(undefined);
  }

  debug(message: string) {
    if (this.props.debug) {
      console.debug(message);
    }
  }
}

function applyInitialTransform(props: Readonly<ZoomPanProps>): Transform | undefined {
  const { position, initialScale, maxScale, imageDimension, containerDimension } = props;

  const scale =
    String(initialScale).toLowerCase() === 'auto'
      ? getAutofitScale(containerDimension, imageDimension)
      : (initialScale as number);
  const minScale = getMinScale(props);

  if (minScale > maxScale) {
    console.warn('minScale cannot exceed maxScale.');
    return;
  }
  if (scale < minScale || scale > maxScale) {
    console.warn('initialScale must be between minScale and maxScale.');
    return;
  }

  let top;
  let left;
  if (position === 'center') {
    left = (containerDimension.width - imageDimension.width * scale) / 2;
    top = (containerDimension.height - imageDimension.height * scale) / 2;
  } else {
    top = 0;
    left = 0;
  }
  return createTransform(top, left, scale);
}

type Updater = (
  updater:
    | ((state: Readonly<ZoomPanState>, props: Readonly<ZoomPanProps>) => ZoomPanState)
    | ZoomPanState,
) => void;

// Zooming and panning cause transform to be requested.
function constrainAndApplyTransform(
  props: Readonly<ZoomPanProps>,
  requestedTransform: Transform,
  tolerance: number,
  speed: number,
  setState: Updater,
) {
  //Correct the transform if needed to prevent overpanning and overzooming
  // Don't constrain for transition so that image can be positioned off-center
  const transform =
    props.transitionEnd !== undefined
      ? requestedTransform
      : getCorrectedTransform(props, requestedTransform, tolerance) ?? requestedTransform;
  return applyTransform(transform, speed, setState);
}

function applyTransform(transform: Transform, speed: number, setState: Updater) {
  if (speed > 0) {
    return runAnimation(transform, speed, setState);
  } else {
    setState(transform);
  }
}

function runAnimation({ top, left, scale }: Transform, speed: number, setState: Updater) {
  let animationHandle: number | undefined = undefined;
  const frame = () => {
    setState((state) => {
      const translateY = top - state.top;
      const translateX = left - state.left;
      const translateScale = scale - state.scale;
      const nextTransform = createTransform(
        snapToTarget(state.top + speed * translateY, top, 1),
        snapToTarget(state.left + speed * translateX, left, 1),
        snapToTarget(state.scale + speed * translateScale, scale, 0.001),
      );
      //animation runs until we reach the target
      if (animationHandle !== undefined && !isEqualTransform(nextTransform, state)) {
        animationHandle = requestAnimationFrame(frame);
        return nextTransform;
      }
      animationHandle = undefined;
      return nextTransform;
    });
  };
  animationHandle = requestAnimationFrame(frame);

  return () => {
    if (animationHandle !== undefined) {
      cancelAnimationFrame(animationHandle);
      animationHandle = undefined;
    }
  };
}

// Returns constrained transform when requested transform is outside constraints with tolerance, otherwise returns null
function getCorrectedTransform(
  props: Readonly<ZoomPanProps>,
  requestedTransform: Transform,
  tolerance: number,
): Transform | undefined {
  const scale = getConstrainedScale(props, requestedTransform.scale, tolerance);

  //get dimensions by which scaled image overflows container
  const { containerDimension, imageDimension, position } = props;
  const negativeSpaceWidth = containerDimension.width - scale * imageDimension.width;
  const negativeSpaceHeight = containerDimension.height - scale * imageDimension.height;
  const overflowWidth = Math.max(0, -negativeSpaceWidth);
  const overflowHeight = Math.max(0, -negativeSpaceHeight);

  //if image overflows container, prevent moving by more than the overflow
  //example: overflow.height = 100, tolerance = 0.05 => top is constrained between -105 and +5
  const upperBoundFactor = 1.0 + tolerance;

  const top = overflowHeight
    ? clamp(
        requestedTransform.top,
        -overflowHeight * upperBoundFactor,
        overflowHeight * upperBoundFactor - overflowHeight,
      )
    : position === 'center'
    ? (containerDimension.height - imageDimension.height * scale) / 2
    : 0;

  const left = overflowWidth
    ? clamp(
        requestedTransform.left,
        -overflowWidth * upperBoundFactor,
        overflowWidth * upperBoundFactor - overflowWidth,
      )
    : position === 'center'
    ? (containerDimension.width - imageDimension.width * scale) / 2
    : 0;

  const constrainedTransform = createTransform(top, left, scale);

  return isEqualTransform(constrainedTransform, requestedTransform)
    ? undefined
    : constrainedTransform;
}

// Returns constrained scale when requested scale is outside min/max with tolerance, otherwise returns requested scale
function getConstrainedScale(
  props: Readonly<ZoomPanProps>,
  requestedScale: number,
  tolerance: number,
) {
  const lowerBoundFactor = 1.0 - tolerance;
  const upperBoundFactor = 1.0 + tolerance;

  return clamp(
    requestedScale,
    getMinScale(props) * lowerBoundFactor,
    props.maxScale * upperBoundFactor,
  );
}

const isInitialized = (top: number, left: number, scale: number) =>
  scale !== 0 || left !== 0 || top !== 0;

const imageStyle = createSelector(
  (state: ZoomPanState) => state.top,
  (state: ZoomPanState) => state.left,
  (state: ZoomPanState) => state.scale,
  (top, left, scale) => {
    let transform;
    let transformOrigin;
    if (isInitialized(top, left, scale)) {
      transform = `translate3d(${left}px, ${top}px, 0) scale(${scale})`;
      transformOrigin = '0 0';
    }
    return {
      cursor: 'pointer',
      transform,
      transformOrigin,
    };
  },
);

const imageOverflow = createSelector(
  (state: ZoomPanState) => state.top,
  (state: ZoomPanState) => state.left,
  (state: ZoomPanState) => state.scale,
  (_: ZoomPanState, props: ZoomPanProps) => props.imageDimension,
  (_: ZoomPanState, props: ZoomPanProps) => props.containerDimension,
  (top, left, scale, imageDimensions, containerDimensions) => {
    if (!isInitialized(top, left, scale)) {
      return null;
    }
    return getImageOverflow(top, left, scale, imageDimensions, containerDimensions);
  },
);

const browserPanActions = createSelector(imageOverflow, (imageOverflow) => {
  //Determine the panning directions where there is no image overflow and let
  //the browser handle those directions (e.g., scroll viewport if possible).
  //Need to replace 'pan-left pan-right' with 'pan-x', etc. otherwise
  //it is rejected (o_O), therefore explicitly handle each combination.
  const browserPanX =
    !imageOverflow?.left && !imageOverflow?.right
      ? 'pan-x' //we can't pan the image horizontally, let the browser take it
      : !imageOverflow.left
      ? 'pan-left'
      : !imageOverflow.right
      ? 'pan-right'
      : '';
  const browserPanY =
    !imageOverflow?.top && !imageOverflow?.bottom
      ? 'pan-y'
      : !imageOverflow.top
      ? 'pan-up'
      : !imageOverflow.bottom
      ? 'pan-down'
      : '';
  if (browserPanX.length === 0 && browserPanY.length === 0) {
    return 'none';
  }
  return [browserPanX, browserPanY].join(' ').trim();
});

const getMinScale = createSelector(
  (props: ZoomPanProps) => props.containerDimension,
  (props: ZoomPanProps) => props.imageDimension,
  (props: ZoomPanProps) => props.minScale,
  (containerDimensions, imageDimensions, minScaleProp) =>
    String(minScaleProp).toLowerCase() === 'auto'
      ? getAutofitScale(containerDimensions, imageDimensions)
      : minScaleProp || 1,
);
