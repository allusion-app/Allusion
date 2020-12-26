import React, { useEffect, useRef, useState } from 'react';
import { Placement } from '@popperjs/core/lib/enums';

import { RawPopover } from './RawPopover';

export interface ITooltip {
  /** The content of the tooltip which is displayed on hover. */
  content: React.ReactText;
  /** The element that triggers the tooltip when hovered over. */
  trigger: React.ReactElement<HTMLElement>;
  /** @default 100 */
  hoverDelay?: number;
  /** @default 'auto' */
  placement?: Placement;
  fallbackPlacements?: Placement[];
  allowedAutoPlacements?: Placement[];
}

export const Tooltip = (props: ITooltip) => {
  const {
    content,
    trigger,
    hoverDelay = 100,
    placement = 'auto',
    allowedAutoPlacements,
    fallbackPlacements,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const timerID = useRef<number>();
  const popover = useRef<HTMLDivElement>(null);

  // Add event listeners to target element to show tooltip on hover
  useEffect(() => {
    if (popover.current === null) {
      return;
    }
    // SAFETY: It the trigger element does not exist or it is not an element,
    // this is a developer error.
    const target = popover.current.previousElementSibling as HTMLElement;

    const handleMouseEnter = () => {
      timerID.current = setTimeout(() => setIsOpen(true), hoverDelay)[Symbol.toPrimitive]();
    };

    const handleMouseLeave = () => {
      if (timerID.current !== undefined) {
        clearTimeout(timerID.current);
        timerID.current = undefined;
      }
      setIsOpen(false);
    };

    target.addEventListener('mouseenter', handleMouseEnter);
    target.addEventListener('mouseleave', handleMouseLeave);

    // Clear timer on removing component
    return () => {
      if (timerID.current !== undefined) {
        clearTimeout(timerID.current);
        timerID.current = undefined;
      }
      target.removeEventListener('mouseenter', handleMouseEnter);
      target.removeEventListener('mouseleave', handleMouseLeave);
    };
  }, [hoverDelay]);

  return (
    <RawPopover
      popoverRef={popover}
      isOpen={isOpen}
      target={trigger}
      role="tooltip"
      placement={placement}
      fallbackPlacements={fallbackPlacements}
      allowedAutoPlacements={allowedAutoPlacements}
    >
      <div className="tooltip">{content}</div>
    </RawPopover>
  );
};
