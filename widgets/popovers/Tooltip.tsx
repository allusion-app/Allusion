import React, { ReactText, useEffect, useRef, useState } from 'react';
import { usePopper } from 'react-popper';

const enum TooltipEvent {
  Show = 'show-tooltip',
  Hide = 'hide-tooltip',
}

let IS_CLEANING_UP = false;

export const TooltipLayer = ({ className }: { className?: string }) => {
  const popoverElement = useRef<HTMLDivElement>(null);
  const anchorElement = useRef<Element | null>();
  const { styles, attributes, update } = usePopper(anchorElement.current, popoverElement.current, {
    placement: 'auto',
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
    ],
  });

  const [isOpen, setIsOpen] = useState(false);
  const content = useRef<ReactText>('');

  useEffect(() => {
    const handleShow = (e: Event) => {
      anchorElement.current = e.target as Element;
      content.current = (e as CustomEvent<ReactText>).detail;
      setIsOpen(true);
      update?.();
      IS_CLEANING_UP = false;
    };

    const handleHide = () => {
      setIsOpen(false);
      anchorElement.current = null;
      IS_CLEANING_UP = true;
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
        anchorElement.current = null;
        IS_CLEANING_UP = true;
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
  }, [update]);

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
  onMouseOver: (e: React.MouseEvent) => void;
  onMouseOut: (e: React.MouseEvent) => void;
};

export function useTooltip(content: ReactText, hoverDelay: number = 500): TooltipHandler {
  const contentRef = useRef(content);
  contentRef.current = content;
  const timerID = useRef<number>();

  // Remove lingering tooltips on element removal and cleanup timer.
  useEffect(() => {
    return () => {
      if (timerID.current !== undefined) {
        clearTimeout(timerID.current);
      } else if (!IS_CLEANING_UP) {
        document.dispatchEvent(new CustomEvent(TooltipEvent.Hide));
        IS_CLEANING_UP = true;
      }
    };
  }, []);

  return useRef<TooltipHandler>({
    onMouseOver: (e: React.MouseEvent) => {
      if (timerID.current === undefined) {
        e.persist();
        const detail = contentRef.current;
        const target = e.currentTarget;
        timerID.current = window.setTimeout(() => {
          timerID.current = undefined;
          target.dispatchEvent(
            new CustomEvent<ReactText>(TooltipEvent.Show, { detail }),
          );
        }, hoverDelay);
      }
    },
    onMouseOut: (e: React.MouseEvent<Element>) => {
      if ((e.currentTarget as HTMLElement).contains(e.relatedTarget as Node)) {
        return;
      }
      e.currentTarget.dispatchEvent(new CustomEvent(TooltipEvent.Hide));
      window.clearTimeout(timerID.current);
      timerID.current = undefined;
    },
  }).current;
}
