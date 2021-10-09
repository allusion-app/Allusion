/**
 * Based on https://github.com/bradstiff/react-responsive-pinch-zoom-pan/tree/bc2b997febae37327ac5696433712371332645af/src
 * MIT license, see LICENSE file
 */

import React from 'react';
import { clamp } from 'src/frontend/utils';

import {
  getPinchLength,
  getPinchMidpoint,
  getRelativePosition,
  isEqualDimension,
  isEqualTransform,
  getAutofitScale,
  tryPreventDefault,
  getImageOverflow,
  Dimension,
  Vec2,
  Transform,
  createTransform,
  getConstrainedScale,
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
  lastPointerUpTimeStamp: number = 0; //enables detecting double-tap
  lastPointerPosition: Vec2 | undefined = undefined; //helps determine how far to pan the image
  lastPinchLength: number = 0; //helps determine if we are pinching in or out
  cancelAnimation: (() => void) | undefined = undefined;
  containerRef = React.createRef<HTMLDivElement>();
  activePointers: { id: number; pos: Vec2 }[] = [];

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
  handlePointerDown = (event: PointerEvent) => {
    this.stopAnimation();

    const pointers = this.activePointers;
    const id = event.pointerId;
    const pointer = { id, pos: createVec2(event.clientX, event.clientY) };
    const index = pointers.findIndex((p) => p.id === id);
    if (index > -1) {
      pointers[index] = pointer;
    } else {
      pointers.push(pointer);
    }

    if (pointers.length === 2) {
      this.lastPinchLength = getPinchLength(pointers[0].pos, pointers[1].pos);
      this.lastPointerPosition = undefined;
    } else if (pointers.length === 1) {
      this.lastPinchLength = 0;
      this.lastPointerPosition = getRelativePosition(pointers[0].pos, this.container);
      if (event.pointerType === 'touch') {
        tryPreventDefault(event); //suppress mouse events
      }
    }
  };

  handlePointerMove = (event: PointerEvent) => {
    const pointers = this.activePointers;
    const id = event.pointerId;
    const pointer = pointers.find((p) => p.id === id);
    if (pointer !== undefined) {
      pointer.pos = createVec2(event.clientX, event.clientY);
    }
    if (pointers.length === 2) {
      this.pinch(pointers[0].pos, pointers[1].pos);
      tryPreventDefault(event); //suppress viewport scaling on iOS
    } else if (pointers.length === 1 && event.buttons) {
      this.pan(pointers[0].pos);
    }
  };

  handlePointerUp = (event: PointerEvent) => {
    const pointers = this.activePointers;

    // Remove pointer from active pointers list
    const id = event.pointerId;
    const index = pointers.findIndex((p) => p.id === id);
    // This can only ever happen, if a synthetic event was dispatched.
    if (index === -1) {
      return;
    }
    const removedPointer = pointers.splice(index, 1);

    if (pointers.length === 0) {
      // Check for double click/tap
      if (this.lastPointerUpTimeStamp + DOUBLE_TAP_THRESHOLD > event.timeStamp) {
        const pointerPosition = getRelativePosition(removedPointer[0].pos, this.container);
        this.doubleClick(pointerPosition);
      }
      this.lastPointerUpTimeStamp = event.timeStamp;
      tryPreventDefault(event); //suppress mouse events
    }

    //We allow transient +/-5% over-pinching.
    //Animate the bounce back to constraints if applicable.
    if (event.pointerType === 'touch') {
      const correctedTransform = getCorrectedTransform(this.props, this.state, 0);
      if (correctedTransform !== undefined) {
        this.startAnimation(animateTransform(correctedTransform, ANIMATION_SPEED, this.setState));
      }
    }
  };

  handleMouseWheel = (event: WheelEvent) => {
    this.stopAnimation();
    const { scale } = this.state;
    const point = getRelativePosition(createVec2(event.clientX, event.clientY), this.container);
    if (event.deltaY > 0) {
      if (scale > this.props.minScale) {
        this.zoomOut(point);
        tryPreventDefault(event);
      }
    } else if (event.deltaY < 0) {
      if (scale < this.props.maxScale) {
        const transform = getZoomedTransform(this.props, this.state, scale * 1.1, point, 0);
        this.setState(transform);
        tryPreventDefault(event);
      }
    }
  };

  //actions
  pan(position: Vec2): void {
    const relativePosition = getRelativePosition(position, this.container);
    if (this.lastPointerPosition === undefined) {
      //if we were pinching and lifted a finger
      this.lastPointerPosition = relativePosition;
      return;
    }
    const translateX = relativePosition[0] - this.lastPointerPosition[0];
    const translateY = relativePosition[1] - this.lastPointerPosition[1];
    this.lastPointerPosition = relativePosition;

    this.setState((state, props) => {
      const top = state.top + translateY;
      const left = state.left + translateX;
      const transform = createTransform(top, left, state.scale);
      if (props.transitionEnd !== undefined) {
        return transform;
      } else {
        return getCorrectedTransform(props, transform, 0) ?? transform;
      }
    });
  }

  doubleClick(position: Vec2) {
    const props = this.props;
    switch (props.doubleTapBehavior) {
      case 'close':
        props.onClose?.();
        break;

      case 'zoom':
        if (this.state.scale * (1 + OVERZOOM_TOLERANCE) < props.maxScale) {
          this.zoomIn(position);
        }
        break;
      case 'reset':
        this.startAnimation(resetTransform(props, this.setState));
        break;
      case 'zoomOrReset':
        const initialScale = getAutofitScale(props.containerDimension, props.imageDimension);
        // If current scale is same as initial scale, zoom in, otherwise reset to initial zoom
        if (Math.abs(this.state.scale - initialScale) < 0.01) {
          this.zoomIn(position);
        } else {
          this.startAnimation(resetTransform(props, this.setState));
        }
        break;
      default:
        break;
    }
  }

  pinch(position1: Vec2, position2: Vec2) {
    const length = getPinchLength(position1, position2);
    const center = getPinchMidpoint(position1, position2);
    const scale =
      this.lastPinchLength > 0
        ? (this.state.scale * length) / this.lastPinchLength //sometimes we get a touchchange before a touchstart when pinching
        : this.state.scale;
    this.lastPinchLength = length;
    const transform = getZoomedTransform(this.props, this.state, scale, center, OVERZOOM_TOLERANCE);
    this.setState(transform);
  }

  zoomIn(center: Vec2) {
    const transform = getZoomedTransform(this.props, this.state, this.state.scale * 2, center, 0);
    this.startAnimation(animateTransform(transform, ANIMATION_SPEED, this.setState));
  }

  zoomOut(center: Vec2) {
    const transform = getZoomedTransform(this.props, this.state, this.state.scale * 0.9, center, 0);
    this.setState(transform);
  }

  updateTransform(oldContainer: Dimension, oldImage: Dimension) {
    const { containerDimension, imageDimension } = this.props;
    const imgDimensionChanged = !isEqualDimension(imageDimension, oldImage);
    const containerDimensionChanged = !isEqualDimension(containerDimension, oldContainer);
    if (!imgDimensionChanged && !containerDimensionChanged) {
      return;
    }
    this.stopAnimation();
    this.setState((state, props) => {
      if (imgDimensionChanged) {
        const transform = getTransform(props);
        if (props.transitionEnd !== undefined) {
          return transform;
        } else {
          return getCorrectedTransform(props, transform, 0.5) ?? transform;
        }
      } else {
        // Keep image centered when container dimensions change (e.g. closing a side bar)
        const top = state.top - (oldContainer[1] - containerDimension[1]) / 2;
        const left = state.left - (oldContainer[0] - containerDimension[0]) / 2;
        const transform = createTransform(top, left, state.scale);
        return getCorrectedTransform(props, transform, 0) ?? transform;
      }
    });
  }

  animateTransitionEnd(oldTransition: Transform | undefined) {
    const { transitionEnd } = this.props;
    if (transitionEnd !== undefined && oldTransition !== transitionEnd) {
      this.startAnimation(animateTransform(transitionEnd, ANIMATION_SPEED / 2, this.setState));
    }
  }

  //lifecycle methods
  render() {
    return (
      <div
        ref={this.containerRef}
        style={{
          width: '100%',
          height: '100%',
          overflow: 'hidden',
          touchAction: browserPanActions(this.state, this.props),
        }}
      >
        {React.cloneElement(this.props.children, {
          onPointerDown: this.handlePointerDown,
          onPointerMove: this.handlePointerMove,
          onPointerUp: this.handlePointerUp,
          onWheel: this.handleMouseWheel,
          onDragStart: tryPreventDefault,
          style: imageStyle(this.state),
        })}
      </div>
    );
  }

  componentDidMount() {
    const transform = getTransform(this.props);
    if (this.props.transitionStart !== undefined) {
      this.startAnimation(animateTransform(transform, ANIMATION_SPEED * 2, this.setState));
    } else {
      this.setState(transform);
    }
  }

  componentDidUpdate(prevProps: Readonly<ZoomPanProps>) {
    this.updateTransform(prevProps.containerDimension, prevProps.imageDimension);
    // Trigger ending transition when transitionEnd prop is passed
    this.animateTransitionEnd(prevProps.transitionEnd);
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

type Updater = (
  updater:
    | ((state: Readonly<ZoomPanState>, props: Readonly<ZoomPanProps>) => ZoomPanState)
    | ZoomPanState,
) => void;

//// ANIMATION

function getTransform(props: Readonly<ZoomPanProps>): Transform {
  const { position, initialScale, minScale, maxScale, imageDimension, containerDimension } = props;

  const scale = clamp(
    initialScale === 'auto' ? getAutofitScale(containerDimension, imageDimension) : initialScale,
    minScale,
    maxScale,
  );

  if (position === 'center') {
    const top = (containerDimension[1] - imageDimension[1] * scale) / 2;
    const left = (containerDimension[0] - imageDimension[0] * scale) / 2;
    return createTransform(top, left, scale);
  } else {
    return createTransform(0, 0, scale);
  }
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

  const top =
    overflowHeight > 0
      ? clamp(
          requestedTransform.top,
          -overflowHeight * upperBoundFactor,
          overflowHeight * upperBoundFactor - overflowHeight,
        )
      : position === 'center'
      ? (containerDimension[1] - imageDimension[1] * scale) / 2
      : 0;

  const left =
    overflowWidth > 0
      ? clamp(
          requestedTransform.left,
          -overflowWidth * upperBoundFactor,
          overflowWidth * upperBoundFactor - overflowWidth,
        )
      : position === 'center'
      ? (containerDimension[0] - imageDimension[0] * scale) / 2
      : 0;

  const constrainedTransform = createTransform(top, left, scale);

  if (isEqualTransform(constrainedTransform, requestedTransform)) {
    return undefined;
  } else {
    return constrainedTransform;
  }
}

function getZoomedTransform(
  props: Readonly<ZoomPanProps>,
  state: Readonly<ZoomPanState>,
  requestedScale: number,
  [px, py]: Vec2,
  tolerance: number,
) {
  const { scale, top, left } = state;
  const { minScale, maxScale, transitionEnd } = props;
  const dx = px - left;
  const dy = py - top;

  const nextScale = getConstrainedScale(requestedScale, minScale, maxScale, tolerance);
  const incrementalScalePercentage = (nextScale - scale) / scale;
  const translateX = dx * incrementalScalePercentage;
  const translateY = dy * incrementalScalePercentage;

  const nextTop = top - translateY;
  const nextLeft = left - translateX;
  const transform = createTransform(nextTop, nextLeft, nextScale);

  if (transitionEnd !== undefined) {
    return transform;
  } else {
    return getCorrectedTransform(props, transform, tolerance) ?? transform;
  }
}

function resetTransform(props: Readonly<ZoomPanProps>, setState: Updater) {
  const requestedTransform = getTransform(props);
  const transform =
    props.transitionEnd !== undefined
      ? requestedTransform
      : getCorrectedTransform(props, requestedTransform, 0.5) ?? requestedTransform;
  return animateTransform(transform, ANIMATION_SPEED, setState);
}

function animateTransform(transform: Transform, speed: number, setState: Updater) {
  let animationHandle: number | undefined = undefined;
  const frame = () => {
    setState((state) => {
      const translateY = transform.top - state.top;
      const translateX = transform.left - state.left;
      const translateScale = transform.scale - state.scale;
      const nextTransform = createTransform(
        state.top + speed * translateY,
        state.left + speed * translateX,
        state.scale + speed * translateScale,
      );
      //animation runs until we reach the target
      if (animationHandle !== undefined && !isEqualTransform(nextTransform, transform)) {
        animationHandle = requestAnimationFrame(frame);
        return nextTransform;
      }
      animationHandle = undefined;
      return transform;
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

//// COMPUTED STATE

function imageStyle({ top, left, scale }: ZoomPanState) {
  return {
    cursor: 'pointer',
    transform: `translate3d(${left}px, ${top}px, 0) scale(${scale})`,
    transformOrigin: '0 0',
  };
}

function imageOverflow(
  { top, left, scale }: ZoomPanState,
  { imageDimension, containerDimension }: ZoomPanProps,
) {
  return getImageOverflow(top, left, scale, imageDimension, containerDimension);
}

function browserPanActions(state: Transform, props: ZoomPanProps) {
  //Determine the panning directions where there is no image overflow and let
  //the browser handle those directions (e.g., scroll viewport if possible).
  //Need to replace 'pan-left pan-right' with 'pan-x', etc. otherwise
  //it is rejected (o_O), therefore explicitly handle each combination.
  const [top, left, right, bottom] = imageOverflow(state, props);
  const hasOverflowX = left !== 0 && right !== 0;
  const hasOverflowY = top !== 0 && bottom !== 0;
  if (!hasOverflowX && !hasOverflowY) {
    return 'none';
  }
  const panX = hasOverflowX ? 'pan-x' : left === 0 ? 'pan-left' : right === 0 ? 'pan-right' : '';
  const panY = hasOverflowY ? 'pan-y' : top === 0 ? 'pan-up' : bottom === 0 ? 'pan-down' : '';
  return [panX, panY].join(' ').trim();
}
