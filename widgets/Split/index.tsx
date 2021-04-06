import './split.scss';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

interface ISplit {
  id?: string;
  primary: React.ReactElement;
  secondary: React.ReactElement;
  axis: 'horizontal' | 'vertical';
  value: number;
  // API-wise it would be better to provide a callback function but we keep track
  // of the panel states already.
  isExpanded: boolean;
  onResize: (value: number, dimension: number) => void;
}

export const Split = ({ id, primary, secondary, axis, value, isExpanded, onResize }: ISplit) => {
  const container = useRef<HTMLDivElement>(null);
  const origin = useRef(0);
  const isDragging = useRef(false);
  const [dimension, setDimension] = useState(0);
  const [innerValue, setInnerValue] = useState(value);
  const valueNow = useMemo(() => Math.round((innerValue / dimension) * 100), [
    dimension,
    innerValue,
  ]);
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
        container.current.style.cursor = 'w-resize';
      } else {
        origin.current = rect.top;
        container.current.style.cursor = 's-resize';
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
      (container.current.firstElementChild as HTMLElement).style.flexBasis = `${innerValue}px`;
    }
  }, [innerValue]);

  useEffect(() => {
    if (isExpanded) {
      setInnerValue(value);
    } else {
      setInnerValue(0);
    }
  }, [isExpanded, value]);

  useEffect(() => {
    const observer = resizeObserver.current;
    const handleMouseUp = () => {
      isDragging.current = false;
      if (container.current !== null) {
        container.current.style.cursor = '';
      }
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
    <div ref={container} id={id} className="split" onMouseMove={handleMouseMove}>
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
