import { VirtualElement, autoPlacement, offset, shift } from '@floating-ui/core';
import { useFloating } from '@floating-ui/react-dom';
import React, { useEffect, useRef, useState } from 'react';

export const TooltipLayer = ({ document }: { document: Document }) => {
  const virtualElement = useRef<VirtualElement>({
    getBoundingClientRect: () => new DOMRect(),
    contextElement: null,
  });
  const { x, y, reference, floating, strategy, update } = useFloating({
    middleware: [
      offset({ mainAxis: 4, crossAxis: 0 }),
      shift({ boundary: document.body, crossAxis: true, padding: 8 }),
      autoPlacement(),
    ],
  });
  const [isOpen, setIsOpen] = useState(false);
  const content = useRef<string>('');
  const timerID = useRef<number>();

  useEffect(() => {
    reference(virtualElement.current);

    const handleShow = (e: MouseEvent | FocusEvent): HTMLElement | undefined => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.dataset['tooltip']) {
        return;
      }
      content.current = target.dataset['tooltip'];
      if (virtualElement.current.contextElement !== target) {
        window.clearTimeout(timerID.current);
        timerID.current = window.setTimeout(() => {
          timerID.current = undefined;
          setIsOpen(true);
          update();
        }, 500);
      }
      const boundingRect = target.getBoundingClientRect();
      virtualElement.current.getBoundingClientRect = () => boundingRect;
      virtualElement.current.contextElement = target;
    };

    const handleHide = (e: MouseEvent | FocusEvent) => {
      if (virtualElement.current.contextElement?.contains(e.relatedTarget as Node)) {
        return;
      }
      setIsOpen(false);
      virtualElement.current.contextElement = null;
      window.clearTimeout(timerID.current);
      timerID.current = undefined;
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        virtualElement.current.contextElement = null;
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
  }, [document, update, reference]);

  return (
    <div
      ref={floating}
      style={{
        position: strategy,
        top: 0,
        left: 0,
        transform: `translate(${Math.round(x ?? 0.0)}px,${Math.round(y ?? 0.0)}px)`,
      }}
      role="tooltip"
      data-popover
      data-open={isOpen}
    >
      {content.current}
    </div>
  );
};
