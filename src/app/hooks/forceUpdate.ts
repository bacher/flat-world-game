import { useCallback, useRef, useState } from 'react';

export function useForceUpdate() {
  const counterRef = useRef(0);
  const [, setValue] = useState(0);

  return useCallback(() => {
    counterRef.current += 1;
    setValue(counterRef.current);
  }, []);
}
