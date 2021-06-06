import { Placement } from '@popperjs/core';
import React, { ReactText, useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';

const enum TooltipEvent {
  Show = 'show-tooltip',
  Hide = 'hide-tooltip',
}

let IS_TOOLTIP_VISIBLE = false;

export const TooltipLayer = ({ className }: { className?: string }) => {
  const popoverElement = useRef<HTMLDivElement>(null);
  const anchorElement = useRef<Element | null>();
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
      { name: 'hide' },
    ],
  }).current;
  const { styles, attributes, forceUpdate } = usePopper(
    anchorElement.current,
    popoverElement.current,
    popperOptions,
  );

  const [isOpen, setIsOpen] = useState(false);
  const content = useRef<ReactText>('');

  useEffect(() => {
    const handleShow = (e: Event) => {
      anchorElement.current = e.target as Element;
      content.current = (e as CustomEvent<ReactText>).detail;
      forceUpdate?.();
      setIsOpen(true);
      IS_TOOLTIP_VISIBLE = true;
    };

    const handleHide = () => {
      setIsOpen(false);
      anchorElement.current = null;
      IS_TOOLTIP_VISIBLE = false;
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        anchorElement.current = null;
        IS_TOOLTIP_VISIBLE = false;
      }
    };

    document.addEventListener(TooltipEvent.Show, handleShow, true);
    document.addEventListener(TooltipEvent.Hide, handleHide, true);
    document.addEventListener('keydown', handleEscape, true);

    return () => {
      document.removeEventListener(TooltipEvent.Show, handleShow, true);
      document.removeEventListener(TooltipEvent.Hide, handleHide, true);
      document.removeEventListener('keydown', handleEscape, true);
    };
  }, [forceUpdate]);

  return (
    <div
      className={className}
      ref={popoverElement}
      style={styles.popper}
      {...attributes.popper}
      role="tooltip"
      data-popover
      data-open={isOpen}
    >
      <div className="tooltip">{content.current}</div>
    </div>
  );
};

type TooltipHandler = {
  onShow: (e: React.MouseEvent | React.FocusEvent) => void;
  onHide: (e: React.MouseEvent | React.FocusEvent) => void;
};

export function useTooltip(content: ReactText): TooltipHandler {
  const contentRef = useRef(content);
  contentRef.current = content;
  const timerID = useRef<number>();

  // Remove lingering tooltips on element removal and cleanup timer.
  useEffect(() => {
    return () => {
      if (timerID.current !== undefined) {
        clearTimeout(timerID.current);
      } else if (IS_TOOLTIP_VISIBLE) {
        document.dispatchEvent(new CustomEvent(TooltipEvent.Hide));
        IS_TOOLTIP_VISIBLE = false;
      }
    };
  }, []);

  return useRef<TooltipHandler>({
    onShow: (e: React.MouseEvent | React.FocusEvent) => {
      if (timerID.current === undefined) {
        e.persist();
        const detail = contentRef.current;
        const target = e.currentTarget;
        timerID.current = window.setTimeout(() => {
          timerID.current = undefined;
          target.dispatchEvent(
            new CustomEvent<ReactText>(TooltipEvent.Show, { detail }),
          );
        }, 500);
      }
    },
    onHide: (e: React.MouseEvent<Element> | React.FocusEvent) => {
      if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        return;
      }
      e.currentTarget.dispatchEvent(new CustomEvent(TooltipEvent.Hide));
      window.clearTimeout(timerID.current);
      timerID.current = undefined;
    },
  }).current;
}
