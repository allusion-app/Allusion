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
  createDimension,
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
  debug?: boolean;

  transitionStart?: Transform;
  transitionEnd?: Transform;
}

export interface ZoomPanState {
  top: number;
  left: number;
  scale: number;
  imageDimension: Dimension;
  containerDimension: Dimension;
}

//Ensure the image is not over-panned, and not over- or under-scaled.
//These constraints must be checked when image changes, and when container is resized.
export default class ZoomPan extends React.Component<ZoomPanProps, ZoomPanState> {
  lastPointerUpTimeStamp: number | undefined = undefined; //enables detecting double-tap
  lastPanPointerPosition: Vec2 | undefined = undefined; //helps determine how far to pan the image
  lastPinchLength: number | undefined; //helps determine if we are pinching in or out
  animation: number | undefined = undefined; //current animation handle
  isTransformInitialized: boolean = false;
  containerRef = React.createRef<HTMLDivElement>();

  constructor(props: ZoomPanProps) {
    super(props);
    this.state = {
      imageDimension: props.imageDimension,
      containerDimension: createDimension(0, 0),
      ...(props.transitionStart ?? createTransform(0, 0, 0)),
    };
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
    return;
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
      if (this.state.scale > getMinScale(this.state, this.props)) {
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
      createVec2(this.state.containerDimension.width / 2, this.state.containerDimension.height / 2),
      0,
      0.1,
    );
  };

  handleZoomOutClick = () => {
    this.cancelAnimation();
    this.zoomOut(
      createVec2(this.state.containerDimension.width / 2, this.state.containerDimension.height / 2),
    );
  };

  //actions
  pointerDown(clientPosition: Touch | MouseEvent) {
    this.lastPanPointerPosition = getRelativePosition(clientPosition, this.container);
  }

  pan(pointerClientPosition: MouseEvent | Touch): void {
    if (!this.isTransformInitialized) {
      return;
    }

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
    this.constrainAndApplyTransform(top, left, this.state.scale, 0, 0);
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
        this.state.containerDimension,
        this.state.imageDimension,
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
    if (!this.isTransformInitialized) {
      return;
    }
    const { scale, top, left } = this.state;
    const dx = containerRelativePoint.x - left;
    const dy = containerRelativePoint.y - top;

    const nextScale = this.getConstrainedScale(requestedScale, tolerance);
    const incrementalScalePercentage = (nextScale - scale) / scale;
    const translateX = dx * incrementalScalePercentage;
    const translateY = dy * incrementalScalePercentage;

    const nextTop = top - translateY;
    const nextLeft = left - translateX;

    this.constrainAndApplyTransform(nextTop, nextLeft, nextScale, tolerance, speed);
  }

  //compare stored dimensions to actual dimensions; capture actual dimensions if different
  maybeHandleDimensionsChanged() {
    // if img resolution is provided, no need to wait for img load before transform

    const containerDimension = this.props.containerDimension;
    const imageDimension = this.props.imageDimension;

    const imgDimensionsChanged = !isEqualDimension(imageDimension, this.state.imageDimension);
    const containerDimensionsChanged = !isEqualDimension(
      containerDimension,
      this.state.containerDimension,
    );
    if (imgDimensionsChanged || containerDimensionsChanged) {
      this.cancelAnimation();

      // Keep image centered when container dimensions change (e.g. closing a side bar)
      const state: ZoomPanState = { ...this.state, containerDimension, imageDimension };
      const oldContainerDims = this.state.containerDimension;
      if (oldContainerDims.width !== 0 && oldContainerDims.height !== 0) {
        state.left = state.left - (oldContainerDims.width - containerDimension.width) / 2;
        state.top = state.top - (oldContainerDims.height - containerDimension.height) / 2;
      }

      //capture new dimensions
      this.setState(state, () => {
        //When image loads and image dimensions are first established, apply initial transform.
        //If dimensions change, constraints change; current transform may need to be adjusted.
        //Transforms depend on state, so wait until state is updated.
        if (!this.isTransformInitialized) {
          this.applyInitialTransform(this.props.transitionStart ? ANIMATION_SPEED * 2 : 0);
          this.isTransformInitialized = true;
        } else {
          // apply initial transform when image changes
          imgDimensionsChanged
            ? this.applyInitialTransform(0)
            : this.maybeAdjustCurrentTransform(0);
        }
      });
      this.debug(
        `Dimensions changed: Container: ${containerDimension}, ${containerDimension}, Image: ${imageDimension}`,
      );
    }
  }

  //transformation methods

  //Zooming and panning cause transform to be requested.
  constrainAndApplyTransform(
    requestedTop: number,
    requestedLeft: number,
    requestedScale: number,
    tolerance: number,
    speed: number,
  ) {
    const requestedTransform = createTransform(requestedTop, requestedLeft, requestedScale);
    this.debug(`Requesting transform: ${requestedTransform}`);

    //Correct the transform if needed to prevent overpanning and overzooming
    // Don't constrain for transition so that image can be positioned off-center
    const transform =
      !this.isTransformInitialized || this.props.transitionEnd !== undefined
        ? requestedTransform
        : this.getCorrectedTransform(requestedTransform, tolerance) ?? requestedTransform;
    this.debug(`Applying transform: ${transform}`);

    if (!isEqualTransform(transform, this.state)) {
      this.applyTransform(transform, speed);
    }
  }

  applyTransform({ top, left, scale }: Transform, speed: number) {
    if (speed > 0) {
      const frame = () => {
        const translateY = top - this.state.top;
        const translateX = left - this.state.left;
        const translateScale = scale - this.state.scale;

        const nextTransform = createTransform(
          snapToTarget(this.state.top + speed * translateY, top, 1),
          snapToTarget(this.state.left + speed * translateX, left, 1),
          snapToTarget(this.state.scale + speed * translateScale, scale, 0.001),
        );

        //animation runs until we reach the target
        if (this.animation !== undefined && !isEqualTransform(nextTransform, this.state)) {
          this.setState(nextTransform, () => (this.animation = requestAnimationFrame(frame)));
        }
      };
      this.animation = requestAnimationFrame(frame);
    } else {
      this.setState(createTransform(top, left, scale));
    }
  }

  //Returns constrained scale when requested scale is outside min/max with tolerance, otherwise returns requested scale
  getConstrainedScale(requestedScale: number, tolerance: number) {
    const lowerBoundFactor = 1.0 - tolerance;
    const upperBoundFactor = 1.0 + tolerance;

    return clamp(
      requestedScale,
      getMinScale(this.state, this.props) * lowerBoundFactor,
      this.props.maxScale * upperBoundFactor,
    );
  }

  //Returns constrained transform when requested transform is outside constraints with tolerance, otherwise returns null
  getCorrectedTransform(requestedTransform: Transform, tolerance: number): Transform | undefined {
    const scale = this.getConstrainedScale(requestedTransform.scale, tolerance);

    //get dimensions by which scaled image overflows container
    const { containerDimension: containerDimensions, imageDimension: imageDimensions } = this.state;
    const negativeSpaceWidth = containerDimensions.width - scale * imageDimensions.width;
    const negativeSpaceHeight = containerDimensions.height - scale * imageDimensions.height;
    const overflowWidth = Math.max(0, -negativeSpaceWidth);
    const overflowHeight = Math.max(0, -negativeSpaceHeight);

    //if image overflows container, prevent moving by more than the overflow
    //example: overflow.height = 100, tolerance = 0.05 => top is constrained between -105 and +5
    const { position } = this.props;
    const upperBoundFactor = 1.0 + tolerance;

    const top = overflowHeight
      ? clamp(
          requestedTransform.top,
          -overflowHeight * upperBoundFactor,
          overflowHeight * upperBoundFactor - overflowHeight,
        )
      : position === 'center'
      ? (containerDimensions.height - imageDimensions.height * scale) / 2
      : 0;

    const left = overflowWidth
      ? clamp(
          requestedTransform.left,
          -overflowWidth * upperBoundFactor,
          overflowWidth * upperBoundFactor - overflowWidth,
        )
      : position === 'center'
      ? (containerDimensions.width - imageDimensions.width * scale) / 2
      : 0;

    const constrainedTransform = createTransform(top, left, scale);

    return isEqualTransform(constrainedTransform, requestedTransform)
      ? undefined
      : constrainedTransform;
  }

  //Ensure current transform is within constraints
  maybeAdjustCurrentTransform(speed: number) {
    const correctedTransform = this.getCorrectedTransform(this.state, 0);
    if (correctedTransform !== undefined) {
      this.applyTransform(correctedTransform, speed);
    }
  }

  applyInitialTransform(speed: number) {
    const { imageDimension: imageDimensions, containerDimension: containerDimensions } = this.state;
    const { position, initialScale, maxScale } = this.props;

    const scale =
      String(initialScale).toLowerCase() === 'auto'
        ? getAutofitScale(containerDimensions, imageDimensions)
        : (initialScale as number);
    const minScale = getMinScale(this.state, this.props);

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
      left = (containerDimensions.width - imageDimensions.width * scale) / 2;
      top = (containerDimensions.height - imageDimensions.height * scale) / 2;
    } else {
      top = 0;
      left = 0;
    }

    const tolerance = 0.5;
    this.constrainAndApplyTransform(top, left, scale, tolerance, speed);
  }

  //lifecycle methods
  render() {
    const containerStyle = {
      width: '100%',
      height: '100%',
      overflow: 'hidden',
      touchAction: browserPanActions(this.state),
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
    this.maybeHandleDimensionsChanged();
  }

  componentDidUpdate() {
    this.maybeHandleDimensionsChanged();
    // Trigger ending transition when transitionEnd prop is passed
    if (this.props.transitionEnd !== undefined) {
      this.applyTransform(this.props.transitionEnd, ANIMATION_SPEED / 2);
    }
  }

  componentWillUnmount() {
    this.cancelAnimation();
  }

  cancelAnimation() {
    if (this.animation !== undefined) {
      cancelAnimationFrame(this.animation);
      this.animation = undefined;
    }
  }

  debug(message: string) {
    if (this.props.debug) {
      console.debug(message);
    }
  }
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
  (state: ZoomPanState) => state.imageDimension,
  (state: ZoomPanState) => state.containerDimension,
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
  (state: ZoomPanState) => state.containerDimension,
  (state: ZoomPanState) => state.imageDimension,
  (_: ZoomPanState, props: ZoomPanProps) => props.minScale,
  (containerDimensions, imageDimensions, minScaleProp) =>
    String(minScaleProp).toLowerCase() === 'auto'
      ? getAutofitScale(containerDimensions, imageDimensions)
      : minScaleProp || 1,
);
