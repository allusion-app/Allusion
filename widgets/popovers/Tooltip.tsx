import { Placement } from '@popperjs/core';
import React, { useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';

export const TooltipLayer = () => {
  const popoverElement = useRef<HTMLDivElement>(null);
  const anchorElement = useRef<Element | null>(null);
  const popperOptions = useRef({
    placement: 'auto' as Placement,
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
      {
        name: 'offset',
        options: { offset: [0, 4] },
      },
    ],
  }).current;
  const { styles, attributes, forceUpdate } = usePopper(
    anchorElement.current,
    popoverElement.current,
    popperOptions,
  );

  const [isOpen, setIsOpen] = useState(false);
  const content = useRef<string>('');
  const timerID = useRef<number>();

  useEffect(() => {
    const handleShow = (e: MouseEvent | FocusEvent) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.dataset['tooltip']) {
        return;
      }
      const tooltip = target.dataset['tooltip'];
      content.current = tooltip;
      if (anchorElement.current !== target) {
        window.clearTimeout(timerID.current);
        timerID.current = window.setTimeout(() => {
          timerID.current = undefined;
          forceUpdate?.();
          setIsOpen(true);
        }, 500);
      }
      anchorElement.current = target;
    };

    const handleHide = (e: MouseEvent | FocusEvent) => {
      if (
        anchorElement.current === null ||
        anchorElement.current.contains(e.relatedTarget as Node)
      ) {
        return;
      }
      setIsOpen(false);
      anchorElement.current = null;
      window.clearTimeout(timerID.current);
      timerID.current = undefined;
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        anchorElement.current = null;
      }
    };

    document.addEventListener('mouseover', handleShow, true);
    document.addEventListener('mouseout', handleHide, true);
    document.addEventListener('focus', handleShow, true);
    document.addEventListener('blur', handleHide, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('mouseover', handleShow, true);
      document.removeEventListener('mouseout', handleHide, true);
      document.removeEventListener('focus', handleShow, true);
      document.removeEventListener('blur', handleHide, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [forceUpdate]);

  return (
    <div
      ref={popoverElement}
      style={styles.popper}
      {...attributes.popper}
      role="tooltip"
      data-popover
      data-open={isOpen}
    >
      {content.current}
    </div>
  );
};
