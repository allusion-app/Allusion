import { useLayoutEffect, useState, useEffect } from 'react';

// For the masonry gallery. Grabbed from https://github.com/jaredLunde/mini-virtual-list/blob/5791a19581e25919858c43c37a2ff0eabaf09bfe/src/index.tsx#L414
const useScroller = <T extends HTMLElement = HTMLElement>(
  ref: React.MutableRefObject<T | null>,
  initialScrollTop?: number,
): { scrollTop: number; isScrolling: boolean } => {
  const [isScrolling, setIsScrolling] = useState(false);
  const [scrollTop, setScrollTop] = useState(initialScrollTop || 0);

  useEffect(() => {
    if (initialScrollTop !== undefined) {
      ref.current?.scrollTo({ top: initialScrollTop });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useLayoutEffect(() => {
    const { current } = ref;
    let tick: number | undefined;

    if (current) {
      const handleScroll = () => {
        if (tick) return;
        tick = window.requestAnimationFrame(() => {
          setScrollTop(current.scrollTop);
          tick = void 0;
        });
      };

      current.addEventListener('scroll', handleScroll);
      return () => {
        current.removeEventListener('scroll', handleScroll);
        if (tick) window.cancelAnimationFrame(tick);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ref.current]);

  useLayoutEffect(() => {
    setIsScrolling(true);
    const to = window.setTimeout(() => {
      // This is here to prevent premature bail outs while maintaining high resolution
      // unsets. Without it there will always bee a lot of unnecessary DOM writes to style.
      setIsScrolling(false);
    }, 1000 / 6);
    return () => window.clearTimeout(to);
  }, [scrollTop]);

  return { scrollTop, isScrolling };
};

export default useScroller;
