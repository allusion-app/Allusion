import { Placement, VirtualElement } from '@popperjs/core';
import React, { useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';

export const TooltipLayer = ({ document }: { document: Document }) => {
  const popoverElement = useRef<HTMLDivElement>(null);
  const virtualElement = useRef<VirtualElement | null>(null);
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
    virtualElement.current,
    popoverElement.current,
    popperOptions,
  );

  const [isOpen, setIsOpen] = useState(false);
  const content = useRef<string>('');
  const timerID = useRef<number>();

  useEffect(() => {
    const handleShow = (e: MouseEvent | FocusEvent): HTMLElement | undefined => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || target.dataset['tooltip'] === undefined) {
        return;
      }
      const tooltip = target.dataset['tooltip'];
      content.current = tooltip;
      if (virtualElement.current?.contextElement !== target) {
        window.clearTimeout(timerID.current);
        timerID.current = window.setTimeout(() => {
          timerID.current = undefined;
          forceUpdate?.();
          setIsOpen(true);
        }, 500);
      }
      return target;
    };

    const handleMouseover = (e: MouseEvent) => {
      const target = handleShow(e);
      if (target !== undefined) {
        const x = e.clientX;
        const y = e.clientY;
        virtualElement.current = {
          getBoundingClientRect: () =>
            ({
              width: 4,
              height: 4,
              top: y,
              right: x,
              bottom: y,
              left: x,
            } as DOMRect),
          contextElement: target,
        };
      }
    };

    const handleFocus = (e: FocusEvent) => {
      const target = handleShow(e);
      if (target !== undefined) {
        virtualElement.current = {
          getBoundingClientRect: () => target.getBoundingClientRect(),
          contextElement: target,
        };
      }
    };

    const handleHide = (e: MouseEvent | FocusEvent) => {
      if (
        virtualElement.current === null ||
        virtualElement.current.contextElement?.contains(e.relatedTarget as Node) === true
      ) {
        return;
      }
      forceUpdate?.();
      setIsOpen(false);
      virtualElement.current = null;
      window.clearTimeout(timerID.current);
      timerID.current = undefined;
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        virtualElement.current = null;
      }
    };

    document.addEventListener('mouseover', handleMouseover, true);
    document.addEventListener('mouseout', handleHide, true);
    document.addEventListener('focus', handleFocus, true);
    document.addEventListener('blur', handleHide, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener('mouseover', handleShow, true);
      document.removeEventListener('mouseout', handleHide, true);
      document.removeEventListener('focus', handleShow, true);
      document.removeEventListener('blur', handleHide, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [document, forceUpdate]);

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
