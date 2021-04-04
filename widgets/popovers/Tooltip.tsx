import React, { useEffect, useRef, useState } from 'react';
import { Placement } from '@popperjs/core/lib/enums';

import { RawPopover } from './RawPopover';

export interface ITooltip {
  /** The content of the tooltip which is displayed on hover. */
  content: React.ReactText;
  /** The element that triggers the tooltip when hovered over. */
  trigger: React.ReactElement<HTMLElement>;
  /** The reference to the native element trigger. This is necessary for the portal! */
  portalTriggerRef: React.RefObject<HTMLElement>;
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
    // 500ms feels about right: https://ux.stackexchange.com/questions/358/how-long-should-the-delay-be-before-a-tooltip-pops-up
    hoverDelay = 500,
    placement = 'auto',
    allowedAutoPlacements,
    fallbackPlacements,
    portalTriggerRef,
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const timerID = useRef<number>();
  const popover = useRef<HTMLDivElement>(null);

  // Add event listeners to target element to show tooltip on hover
  useEffect(() => {
    if (portalTriggerRef.current === null) {
      return;
    }
    // SAFETY: It the trigger element does not exist or it is not an element,
    // this is a developer error.
    const target = portalTriggerRef.current;

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

    target.addEventListener('mouseover', handleMouseEnter, true);
    target.addEventListener('mouseout', handleMouseLeave, true);

    // Clear timer on removing component
    return () => {
      if (timerID.current !== undefined) {
        clearTimeout(timerID.current);
        timerID.current = undefined;
      }
      target.removeEventListener('mouseover', handleMouseEnter, true);
      target.removeEventListener('mouseout', handleMouseLeave, true);
    };
  }, [content, hoverDelay, portalTriggerRef, trigger]);

  return (
    <RawPopover
      popoverRef={popover}
      isOpen={isOpen}
      target={trigger}
      targetRef={portalTriggerRef}
      role="tooltip"
      placement={placement}
      fallbackPlacements={fallbackPlacements}
      allowedAutoPlacements={allowedAutoPlacements}
      portalId="tooltip-portal"
    >
      <div className="tooltip">{content}</div>
    </RawPopover>
  );
};
