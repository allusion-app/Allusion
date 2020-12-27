import './transition.scss';
import React, { useLayoutEffect, useRef } from 'react';

interface ITransition {
  element?: React.ElementType;
  id?: string;
  open: boolean;
  unmountOnExit?: boolean;
  children: React.ReactNode;
}

export const Collapse = ({ id, element: Element = 'div', open, children }: ITransition) => {
  const transition = useRef<HTMLDivElement | null>(null);

  useLayoutEffect(() => {
    const container = transition.current;
    if (container === null) {
      return;
    }
    function handleTransitionStart(this: HTMLElement, e: TransitionEvent) {
      if (e.target !== this) {
        return;
      }
      this.style.overflowY = 'hidden';
      if (open) {
        this.style.maxHeight = '';
      } else {
        this.style.maxHeight = this.clientHeight + 'px';
      }
    }
    container.addEventListener('transitionstart', handleTransitionStart);

    return () => {
      container.removeEventListener('transitionstart', handleTransitionStart);
    };
  }, [open]);

  const handleTransitionEnd = (e: React.TransitionEvent<HTMLElement>) => {
    if (e.target !== e.currentTarget) {
      return;
    }
    if (open) {
      e.currentTarget.style.overflowY = '';
    }
  };

  return (
    <Element
      id={id}
      data-transition-in={open}
      className="collapse"
      ref={transition}
      onTransitionEnd={handleTransitionEnd}
    >
      {children}
    </Element>
  );
};
