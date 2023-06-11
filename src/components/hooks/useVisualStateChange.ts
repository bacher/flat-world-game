import { useContext, useEffect } from 'react';
import { GameStateWatcherContext } from '../contexts/GameStateWatcher';

export function useVisualStateChange(callback: () => void): void {
  const watcher = useContext(GameStateWatcherContext);

  useEffect(() => {
    if (!watcher) {
      return undefined;
    }
    return watcher.onVisualStateChange(callback);
  }, [watcher]);
}
