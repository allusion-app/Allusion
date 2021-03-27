import { useEffect, useRef, useState } from 'react';

export default function useMountState(): [boolean, React.RefObject<boolean>] {
  const [isMounted, setIsMounted] = useState(false);
  const isMountedRef = useRef(false);
  useEffect(() => {
    setIsMounted(true);
    isMountedRef.current = true;
    return () => {
      setIsMounted(false);
      isMountedRef.current = false;
    };
  }, []);

  return [isMounted, isMountedRef];
}
