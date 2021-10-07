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
  cancelAnimation: (() => void) | undefined = undefined;
  containerRef = React.createRef<HTMLDivElement>();

  constructor(props: ZoomPanProps) {
    super(props);
    this.state = props.transitionStart ?? createTransform(0, 0, 0);
    this.setState = this.setState.bind(this);
  }

  private get container(): HTMLDivElement {
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
    return this.containerRef.current!;
  }

  //event handlers
  handleTouchStart = (event: TouchEvent) => {
    this.stopAnimation();

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
    this.stopAnimation();
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
    const correctedTransform = getCorrectedTransform(this.props, this.state, 0);
    if (correctedTransform !== undefined) {
      this.startAnimation(animateTransform(correctedTransform, ANIMATION_SPEED, this.setState));
    }
  };

  handleMouseDown = (event: MouseEvent) => {
    this.stopAnimation();
    this.pointerDown(event);
  };

  handleMouseMove = (event: MouseEvent) => {
    if (!event.buttons) return null;
    this.pan(event);
  };

  handleMouseDoubleClick = (event: MouseEvent) => {
    this.stopAnimation();
    const pointerPosition = getRelativePosition(event, this.container);
    this.doubleClick(pointerPosition);
  };

  handleMouseWheel = (event: WheelEvent) => {
    this.stopAnimation();
    const point = getRelativePosition(event, this.container);
    if (event.deltaY > 0) {
      if (this.state.scale > this.props.minScale) {
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
    this.stopAnimation();
    this.zoomIn(
      createVec2(this.props.containerDimension[0] / 2, this.props.containerDimension[1] / 2),
      0,
      0.1,
    );
  };

  handleZoomOutClick = () => {
    this.stopAnimation();
    this.zoomOut(
      createVec2(this.props.containerDimension[0] / 2, this.props.containerDimension[1] / 2),
    );
  };

  //actions
  pointerDown(clientPosition: Touch | MouseEvent) {
    this.lastPanPointerPosition = getRelativePosition(clientPosition, this.container);
  }

  pan(pointerClientPosition: MouseEvent | Touch): void {
    if (this.lastPanPointerPosition === undefined) {
      //if we were pinching and lifted a finger
      this.pointerDown(pointerClientPosition);
      return;
    }

    const pointerPosition = getRelativePosition(pointerClientPosition, this.container);
    const translateX = pointerPosition[0] - this.lastPanPointerPosition[0];
    const translateY = pointerPosition[1] - this.lastPanPointerPosition[1];
    this.lastPanPointerPosition = pointerPosition;

    this.setState((state, props) => {
      const top = state.top + translateY;
      const left = state.left + translateX;
      const requestedTransform = createTransform(top, left, state.scale);
      if (props.transitionEnd !== undefined) {
        return requestedTransform;
      } else {
        return getCorrectedTransform(props, requestedTransform, 0) ?? requestedTransform;
      }
    });
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
      this.resetTransform();
    }
    if (doubleTapBehavior === 'zoomOrReset') {
      const initialScale = getAutofitScale(
        this.props.containerDimension,
        this.props.imageDimension,
      );
      // If current scale is same as initial scale, zoom in, otherwise reset to initial zoom
      Math.abs(this.state.scale - initialScale) < 0.01
        ? this.zoomIn(pointerPosition, ANIMATION_SPEED, 1)
        : this.resetTransform();
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

  zoom(requestedScale: number, [px, py]: Vec2, tolerance: number, speed: number) {
    const { scale, top, left } = this.state;
    const { minScale, maxScale } = this.props;
    const dx = px - left;
    const dy = py - top;

    const nextScale = getConstrainedScale(requestedScale, minScale, maxScale, tolerance);
    const incrementalScalePercentage = (nextScale - scale) / scale;
    const translateX = dx * incrementalScalePercentage;
    const translateY = dy * incrementalScalePercentage;

    const nextTop = top - translateY;
    const nextLeft = left - translateX;
    const requestedTransform = createTransform(nextTop, nextLeft, nextScale);

    const transform =
      this.props.transitionEnd !== undefined
        ? requestedTransform
        : getCorrectedTransform(this.props, requestedTransform, tolerance) ?? requestedTransform;
    if (speed > 0) {
      this.startAnimation(animateTransform(transform, speed, this.setState));
    } else {
      this.setState(transform);
    }
  }

  // transformation methods

  updateTransform(oldContainer: Dimension, oldImage: Dimension) {
    const { containerDimension, imageDimension } = this.props;
    const imgDimensionChanged = !isEqualDimension(imageDimension, oldImage);
    const containerDimensionChanged = !isEqualDimension(containerDimension, oldContainer);
    if (!imgDimensionChanged && !containerDimensionChanged) {
      return;
    }
    this.stopAnimation();
    this.setState((state, props) => {
      // Keep image centered when container dimensions change (e.g. closing a side bar)
      const top = state.top - (oldContainer[1] - containerDimension[1]) / 2;
      const left = state.left - (oldContainer[0] - containerDimension[0]) / 2;

      let transform: Transform | undefined = undefined;
      if (imgDimensionChanged) {
        const requestedTransform = getTransform(props);
        if (requestedTransform !== undefined) {
          transform =
            props.transitionEnd !== undefined
              ? requestedTransform
              : getCorrectedTransform(props, requestedTransform, 0.5) ?? requestedTransform;
        }
      } else {
        transform = getCorrectedTransform(props, createTransform(top, left, state.scale), 0);
      }
      return transform ?? createTransform(top, left, state.scale);
    });
  }

  resetTransform() {
    const requestedTransform = getTransform(this.props);
    if (requestedTransform !== undefined) {
      const transform =
        this.props.transitionEnd !== undefined
          ? requestedTransform
          : getCorrectedTransform(this.props, requestedTransform, 0.5) ?? requestedTransform;
      this.startAnimation(animateTransform(transform, ANIMATION_SPEED, this.setState));
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
    const transform = getTransform(this.props);
    if (transform !== undefined) {
      if (this.props.transitionStart !== undefined) {
        this.startAnimation(animateTransform(transform, ANIMATION_SPEED * 2, this.setState));
      } else {
        this.setState(transform);
      }
    }
  }

  componentDidUpdate(prevProps: Readonly<ZoomPanProps>) {
    this.updateTransform(prevProps.containerDimension, prevProps.imageDimension);
    // Trigger ending transition when transitionEnd prop is passed
    if (this.props.transitionEnd !== undefined) {
      this.startAnimation(
        animateTransform(this.props.transitionEnd, ANIMATION_SPEED / 2, this.setState),
      );
    }
  }

  componentWillUnmount() {
    this.stopAnimation();
  }

  startAnimation(cancel: () => void) {
    this.cancelAnimation?.();
    this.cancelAnimation = cancel;
  }

  stopAnimation() {
    this.cancelAnimation?.();
    this.cancelAnimation = undefined;
  }
}

function getTransform(props: Readonly<ZoomPanProps>): Transform | undefined {
  const { position, initialScale, minScale, maxScale, imageDimension, containerDimension } = props;

  const scale =
    initialScale === 'auto' ? getAutofitScale(containerDimension, imageDimension) : initialScale;

  if (minScale > maxScale) {
    console.warn('minScale cannot exceed maxScale.');
    return undefined;
  }
  if (scale < minScale || scale > maxScale) {
    console.warn('initialScale must be between minScale and maxScale.');
    return undefined;
  }

  let top;
  let left;
  if (position === 'center') {
    left = (containerDimension[0] - imageDimension[0] * scale) / 2;
    top = (containerDimension[1] - imageDimension[1] * scale) / 2;
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

function animateTransform({ top, left, scale }: Transform, speed: number, setState: Updater) {
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
  const { containerDimension, imageDimension, position, minScale, maxScale } = props;
  const scale = getConstrainedScale(requestedTransform.scale, minScale, maxScale, tolerance);

  //get dimensions by which scaled image overflows container
  const negativeSpaceWidth = containerDimension[0] - scale * imageDimension[0];
  const negativeSpaceHeight = containerDimension[1] - scale * imageDimension[1];
  const overflowWidth = Math.max(0, -negativeSpaceWidth);
  const overflowHeight = Math.max(0, -negativeSpaceHeight);

  //if image overflows container, prevent moving by more than the overflow
  //example: overflow[1] = 100, tolerance = 0.05 => top is constrained between -105 and +5
  const upperBoundFactor = 1.0 + tolerance;

  const top = overflowHeight
    ? clamp(
        requestedTransform.top,
        -overflowHeight * upperBoundFactor,
        overflowHeight * upperBoundFactor - overflowHeight,
      )
    : position === 'center'
    ? (containerDimension[1] - imageDimension[1] * scale) / 2
    : 0;

  const left = overflowWidth
    ? clamp(
        requestedTransform.left,
        -overflowWidth * upperBoundFactor,
        overflowWidth * upperBoundFactor - overflowWidth,
      )
    : position === 'center'
    ? (containerDimension[0] - imageDimension[0] * scale) / 2
    : 0;

  const constrainedTransform = createTransform(top, left, scale);

  return isEqualTransform(constrainedTransform, requestedTransform)
    ? undefined
    : constrainedTransform;
}

// Returns constrained scale when requested scale is outside min/max with tolerance, otherwise returns requested scale
function getConstrainedScale(
  requestedScale: number,
  minScale: number,
  maxScale: number,
  tolerance: number,
) {
  const lowerBoundFactor = 1.0 - tolerance;
  const upperBoundFactor = 1.0 + tolerance;
  return clamp(requestedScale, minScale * lowerBoundFactor, maxScale * upperBoundFactor);
}

const imageStyle = createSelector(
  (state: ZoomPanState) => state.top,
  (state: ZoomPanState) => state.left,
  (state: ZoomPanState) => state.scale,
  (top, left, scale) => {
    let transform;
    let transformOrigin;
    if (scale !== 0 || left !== 0 || top !== 0) {
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
  (top, left, scale, imageDimensions, containerDimensions) =>
    getImageOverflow(top, left, scale, imageDimensions, containerDimensions),
);

const browserPanActions = createSelector(imageOverflow, (imageOverflow) => {
  //Determine the panning directions where there is no image overflow and let
  //the browser handle those directions (e.g., scroll viewport if possible).
  //Need to replace 'pan-left pan-right' with 'pan-x', etc. otherwise
  //it is rejected (o_O), therefore explicitly handle each combination.
  const [top, left, right, bottom] = imageOverflow;
  const hasOverflowX = left !== 0 && right !== 0;
  const hasOverflowY = top !== 0 && bottom !== 0;
  if (!hasOverflowX && !hasOverflowY) {
    return 'none';
  }
  const panX = hasOverflowX ? 'pan-x' : left === 0 ? 'pan-left' : right === 0 ? 'pan-right' : '';
  const panY = hasOverflowY ? 'pan-y' : top === 0 ? 'pan-up' : bottom === 0 ? 'pan-down' : '';
  return [panX, panY].join(' ').trim();
});
