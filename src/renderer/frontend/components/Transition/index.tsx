import './transition.scss';
import React, { useLayoutEffect, useRef, useState } from 'react';

interface ITransition {
  element?: React.ElementType;
  id?: string;
  open: boolean;
  unmountOnExit?: boolean;
  children: React.ReactNode;
}

export const Slide = ({
  id,
  element: Element = 'div',
  open,
  unmountOnExit,
  children,
}: ITransition) => {
  const transition = useRef<HTMLElement | null>(null);
  const [hide, setHide] = useState(unmountOnExit && !open);

  useLayoutEffect(() => {
    const container = transition.current;
    function handleTransitionStart(this: HTMLElement) {
      if (this.dataset['transitionIn'] === 'true') {
        this.style.maxWidth = '';
      } else {
        this.style.maxWidth = this.clientWidth + 'px';
      }
    }
    function handleTransitionEnd(this: HTMLElement) {
      if (!unmountOnExit || this.firstElementChild === null) {
        return;
      }
      if (this.dataset['transitionIn'] === 'true') {
        setHide(false);
      } else {
        setHide(true);
      }
    }
    container?.addEventListener('transitionstart', handleTransitionStart);
    container?.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      container?.removeEventListener('transitionstart', handleTransitionStart);
      container?.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [unmountOnExit]);

  return (
    <Element id={id} data-transition-in={open} className="horizontal-transition" ref={transition}>
      {hide ? open && children : children}
    </Element>
  );
};

export const Collapse = ({
  id,
  element: Element = 'div',
  open,
  unmountOnExit,
  children,
}: ITransition) => {
  const transition = useRef<HTMLDivElement | null>(null);
  const [hide, setHide] = useState(unmountOnExit && !open);

  useLayoutEffect(() => {
    const container = transition.current;
    function handleTransitionStart(this: HTMLElement) {
      if (this.dataset['transitionIn'] === 'true') {
        this.style.maxHeight = '';
      } else {
        this.style.maxHeight = this.clientHeight + 'px';
      }
    }
    function handleTransitionEnd(this: HTMLElement) {
      if (!unmountOnExit || this.firstElementChild === null) {
        return;
      }
      if (this.dataset['transitionIn'] === 'true') {
        setHide(false);
      } else {
        setHide(true);
      }
    }
    container?.addEventListener('transitionstart', handleTransitionStart);
    container?.addEventListener('transitionend', handleTransitionEnd);

    return () => {
      container?.removeEventListener('transitionstart', handleTransitionStart);
      container?.removeEventListener('transitionend', handleTransitionEnd);
    };
  }, [unmountOnExit]);

  return (
    <Element id={id} data-transition-in={open} className="vertical-transition" ref={transition}>
      {hide ? open && children : children}
    </Element>
  );
};
