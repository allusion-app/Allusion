import React, { useRef, useCallback } from 'react';
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
  className?: string;
  /** Closes the flyout when the `Escape` key is pressed. */
  onCancel?: () => void;
  placement?: Placement;
  /** Flip modifier settings */
  fallbackPlacements?: Placement[];
  allowedAutoPlacements?: Placement[];
}

export const Flyout = (props: IFlyout) => {
  const {
    isOpen: open,
    label,
    labelledby,
    describedby,
    className,
    onCancel,
    target,
    children,
    placement,
    fallbackPlacements,
    allowedAutoPlacements,
  } = props;

  const popover = useRef<HTMLDialogElement>(null);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (onCancel !== undefined) {
          e.stopPropagation();
          onCancel();
          // Returns focus to the `target` element.
          const target = e.currentTarget.previousElementSibling as HTMLElement;
          target.focus();
        } else {
          e.preventDefault();
        }
      }
    },
    [onCancel],
  );

  return (
    <RawPopover
      popoverRef={popover}
      isOpen={open}
      target={target}
      container="div"
      placement={placement}
      fallbackPlacements={fallbackPlacements}
      allowedAutoPlacements={allowedAutoPlacements}
      role="dialog"
      aria-modal={true}
      data-flyout
      aria-label={label}
      aria-labelledby={labelledby}
      aria-describedby={describedby}
      className={className}
      onKeyDown={handleKeyDown}
    >
      {children}
    </RawPopover>
  );
};

export default Flyout;
