import React, { useEffect, useRef, useState } from 'react';

interface ICollapse {
  element?: React.ElementType;
  id?: string;
  open: boolean;
  children: React.ReactNode;
}

export const Collapse = ({ id, element: Element = 'div', open, children }: ICollapse) => {
  const transition = useRef<HTMLDivElement | null>(null);
  const [isVisible, setIsVisible] = useState(open);

  useEffect(() => {
    const container = transition.current;
    if (container !== null) {
      container.style.transition = 'height 0.2s ease-out';
    }
  }, []);

  useEffect(() => {
    const container = transition.current;
    if (container === null) {
      return;
    }

    let timerId: undefined | number = undefined;
    let frameId: undefined | number = undefined;

    if (open) {
      setIsVisible(true);
      frameId = requestAnimationFrame(() => {
        // Apply transform and transition to children in first raf call.
        for (let i = 0; i < container.childElementCount; i++) {
          const element = container.children[i] as HTMLElement;
          element.style.transform = 'translateY(-100%)';
          element.style.transition = 'transform 0.2s ease-out';
        }

        // Trigger expand transition.
        frameId = requestAnimationFrame(() => {
          container.style.height = '';
          container.style.minHeight = '';
          for (let i = 0; i < container.childElementCount; i++) {
            const element = container.children[i] as HTMLElement;
            element.style.transform = '';
          }

          // Reset overflow on expand transition end.
          timerId = window.setTimeout(() => {
            frameId = requestAnimationFrame(() => {
              container.style.overflowY = '';
              frameId = undefined;
              timerId = undefined;
            });
          }, 200);
        });
      });
    } else {
      frameId = requestAnimationFrame(() => {
        // Read height in first raf call.
        const height = container.scrollHeight;

        // Write height to prepare for transition.
        container.style.height = `${height}px`;

        // Trigger collapse transition.
        frameId = requestAnimationFrame(() => {
          container.style.overflowY = 'hidden';
          container.style.height = '0';
          container.style.minHeight = '0';
          for (let i = 0; i < container.childElementCount; i++) {
            const element = container.children[i] as HTMLElement;
            element.style.transform = 'translateY(-100%)';
          }

          // Remove children on collapse transition end.
          timerId = window.setTimeout(() => {
            setIsVisible(false);
            timerId = undefined;
          }, 200);
          frameId = undefined;
        });
      });
    }

    // Clear pending animation requests and timers.
    return () => {
      window.clearTimeout(timerId);
      if (frameId !== undefined) {
        cancelAnimationFrame(frameId);
      }
    };
  }, [open]);

  return (
    <Element id={id} className="collapse" ref={transition}>
      {isVisible ? children : null}
    </Element>
  );
};
