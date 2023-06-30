import { useEffect } from 'react';

export function useWindowEvent(
  eventName: string,
  callback: (event: Event) => void,
): void {
  useEffect(() => {
    window.addEventListener(eventName, callback, { passive: true });

    return () => {
      window.removeEventListener(eventName, callback);
    };
  }, []);
}
