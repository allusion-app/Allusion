import React, { useEffect, useRef } from 'react';
import { usePopper } from 'react-popper';
import { VirtualElement } from '@popperjs/core';
import { Placement } from '@popperjs/core/lib/enums';

export interface IRawPopover extends React.HTMLAttributes<HTMLElement> {
  /** Controls whether the popover is shown or not. */
  isOpen: boolean;
  /** The (virtual) element that used to position the popover relative to. If no element is passed it will by default use the target element. */
  anchorElement?: HTMLElement | VirtualElement | null;
  /** The reference to the popover native element. */
  popoverRef: React.RefObject<HTMLElement>;
  /** The element that is used as an anchor point for the popover to decide where to position. */
  target?: React.ReactElement<HTMLElement>;
  /** The actual popover content. */
  children: React.ReactNode;
  /** The native element used as container element for the popover content. */
  container?: React.ElementType;
  /** The default or preferred placement of the popover as long there is enough space for it to be positioned there. */
  placement?: Placement;
  /** Flip modifier settings */
  fallbackPlacements?: Placement[];
  allowedAutoPlacements?: Placement[];
}

export const RawPopover = (props: IRawPopover) => {
  const {
    isOpen,
    anchorElement,
    popoverRef,
    target,
    children,
    placement,
    fallbackPlacements,
    allowedAutoPlacements,
    container: Container = 'div',
    ...restProperties
  } = props;

  /** React typings are still horrible :) */
  const options = useRef(createPopperOptions(placement, fallbackPlacements, allowedAutoPlacements));

  const { styles, attributes, forceUpdate } = usePopper(
    anchorElement ?? popoverRef.current?.previousElementSibling,
    popoverRef.current,
    options.current,
  );

  useEffect(() => {
    if (isOpen) {
      forceUpdate?.();
    }
  }, [isOpen, forceUpdate]);

  const properties = Object.assign(
    restProperties,
    { ref: popoverRef, 'data-popover': true, 'data-open': isOpen, style: styles.popper },
    attributes.popper,
  );

  return (
    <>
      {target}
      <Container {...properties}>{children}</Container>
    </>
  );
};

function createPopperOptions(
  placement?: Placement,
  fallbackPlacements?: Placement[],
  allowedAutoPlacements?: Placement[],
) {
  return {
    placement,
    modifiers: [
      {
        name: 'preventOverflow',
        options: {
          // Prevents dialogs from moving elements to the side
          boundary: document.body,
          altAxis: true,
          padding: 8,
        },
      },
      { name: 'flips', options: { fallbackPlacements, allowedAutoPlacements } },
    ],
  };
}
