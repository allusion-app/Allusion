import React, { useRef } from 'react';
import { Placement } from '@popperjs/core/lib/enums';

import { RawPopover } from './RawPopover';

export interface IFlyout {
  isOpen: boolean;
  label?: string;
  labelledby?: string;
  describedby?: string;
  target: React.ReactElement<HTMLElement>;
  /** The popover content. */
  children: React.ReactNode;
  /** Closes the flyout when the `Escape` key is pressed or clicked outside. */
  cancel: () => void;
  /** When this specific element is focused, the FlyOut is not closed */
  ignoreCloseForElementOnBlur?: HTMLElement;
  placement?: Placement;
  /** Flip modifier settings */
  fallbackPlacements?: Placement[];
  allowedAutoPlacements?: Placement[];
}

/**
 * A dismissable dialog modal
 */
export const Flyout = (props: IFlyout) => {
  const {
    isOpen,
    label,
    labelledby,
    describedby,
    cancel,
    ignoreCloseForElementOnBlur,
    target,
    children,
    placement,
    fallbackPlacements,
    allowedAutoPlacements,
  } = props;

  const popover = useRef<HTMLDivElement>(null);

  const handleBlur = (e: React.FocusEvent) => {
    if (e.relatedTarget === ignoreCloseForElementOnBlur) return;
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      cancel();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.stopPropagation();
      cancel();
      // Returns focus to the `target` element.
      (e.currentTarget.previousElementSibling as HTMLElement).focus();
    }
  };

  return (
    <RawPopover
      popoverRef={popover}
      isOpen={isOpen}
      target={target}
      placement={placement}
      fallbackPlacements={fallbackPlacements}
      allowedAutoPlacements={allowedAutoPlacements}
      role="dialog"
      aria-modal={true}
      data-flyout
      aria-label={label}
      aria-labelledby={labelledby}
      aria-describedby={describedby}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      {children}
    </RawPopover>
  );
};

export default Flyout;
