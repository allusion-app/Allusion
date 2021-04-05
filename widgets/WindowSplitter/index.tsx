import './window-splitter.scss';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface IWindowSplitter {
  id?: string;
  primary: React.ReactElement;
  secondary: React.ReactElement;
  axis: 'horizontal' | 'vertical';
  value: number;
  onResize: (value: number, dimension: number) => void;
}

export const WindowSplitter = ({
  id,
  primary,
  secondary,
  axis,
  value,
  onResize,
}: IWindowSplitter) => {
  const container = useRef<HTMLDivElement>(null);
  const origin = useRef(0);
  const isDragging = useRef(false);
  const [dimension, setDimension] = useState(0);
  const valueNow = useMemo(() => Math.round((value / dimension) * 100), [dimension, value]);
  const resizeObserver = useRef(
    new ResizeObserver((entries) => {
      const {
        contentRect: { width, height },
      } = entries[0];
      if (axis === 'vertical') {
        setDimension(width);
      } else {
        setDimension(height);
      }
    }),
  );

  const handleMouseDown = useRef(() => {
    if (container.current !== null) {
      const rect = container.current.getBoundingClientRect();
      if (axis === 'vertical') {
        origin.current = rect.left;
      } else {
        origin.current = rect.top;
      }
      isDragging.current = true;
    }
  });

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging.current) {
        return;
      }

      if (axis === 'vertical') {
        onResize(e.clientX - origin.current, e.currentTarget.clientWidth);
      } else {
        onResize(e.clientY - origin.current, e.currentTarget.clientHeight);
      }
    },
    [onResize, axis],
  );

  useEffect(() => {
    if (container.current !== null) {
      (container.current.firstElementChild as HTMLElement).style.flexBasis = `${value}px`;
    }
  }, [value]);

  useEffect(() => {
    const observer = resizeObserver.current;
    const handleMouseUp = () => {
      isDragging.current = false;
    };
    document.body.addEventListener('mouseup', handleMouseUp);
    if (container.current !== null) {
      resizeObserver.current.observe(container.current);
    }
    return () => {
      observer.disconnect();
      document.body.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  return (
    <div ref={container} id={id} className="window-splitter" onMouseMove={handleMouseMove}>
      {primary}
      <div
        role="separator"
        aria-valuenow={valueNow}
        aria-orientation={axis}
        onMouseDown={handleMouseDown.current}
      />
      {secondary}
    </div>
  );
};
