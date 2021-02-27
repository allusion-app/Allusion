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
  usePortal?: boolean;
}

export const Tooltip = (props: ITooltip) => {
  const {
    content,
    trigger,
    // 500ms feels about right: https://ux.stackexchange.com/questions/358/how-long-should-the-delay-be-before-a-tooltip-pops-up
    hoverDelay = 500,
    placement = 'auto',
    allowedAutoPlacements,
    fallbackPlacements,
    usePortal = true,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const timerID = useRef<number>();
  const popover = useRef<HTMLDivElement>(null);
  const targetRef = useRef<HTMLDivElement>(null);

  // Add event listeners to target element to show tooltip on hover
  useEffect(() => {
    if (popover.current === null) {
      return;
    }
    // SAFETY: It the trigger element does not exist or it is not an element,
    // this is a developer error.
    const target = targetRef.current;
    if (!target) {
      console.error('Tooltip target not set', content, trigger);
      return;
    }

    const handleMouseEnter = () => {
      timerID.current = (setTimeout(() => setIsOpen(true), hoverDelay) as unknown) as number;
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
  }, [content, hoverDelay, trigger, usePortal]);

  return (
    <RawPopover
      popoverRef={popover}
      isOpen={isOpen}
      target={trigger}
      targetRef={targetRef}
      role="tooltip"
      placement={placement}
      fallbackPlacements={fallbackPlacements}
      allowedAutoPlacements={allowedAutoPlacements}
      usePortal={usePortal}
      portalId="tooltip-portal"
    >
      <div className="tooltip">{content}</div>
    </RawPopover>
  );
};
