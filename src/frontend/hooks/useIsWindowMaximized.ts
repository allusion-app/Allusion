import { useState, useEffect } from 'react';

/** Returns whether the window is maximized; when it takes up the available width and height of the screen */
const useIsWindowMaximized = () => {
  const [isWindowMaximized, setIsWindowMaximized] = useState(
    window.outerWidth === screen.availWidth && window.outerHeight === screen.availHeight,
  );

  useEffect(() => {
    const handleResize = () => {
      console.log(
        'resize',
        window.outerWidth,
        window.outerHeight,
        screen.availWidth,
        screen.availHeight,
      );
      setIsWindowMaximized(
        window.outerWidth === screen.availWidth && window.outerHeight === screen.availHeight,
      );
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  return isWindowMaximized;
};

export default useIsWindowMaximized;
