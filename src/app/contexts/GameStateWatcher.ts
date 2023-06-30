import { createContext } from 'react';

type GameStateWatcher = {
  emitTick: () => void;
  emitVisualStateChange: () => void;
  onTick: (callback: () => void) => () => void;
  onVisualStateChange: (callback: () => void) => () => void;
};

export const GameStateWatcherContext = createContext<
  GameStateWatcher | undefined
>(undefined);

export function createGameStateWatcher(): GameStateWatcher {
  const tickListeners: (() => void)[] = [];
  const visualStateListeners: (() => void)[] = [];

  return {
    emitTick: () => {
      for (const listener of tickListeners) {
        listener();
      }
    },
    onTick: (callback) => {
      tickListeners.push(callback);

      return () => {
        const index = tickListeners.findIndex(callback);
        if (index !== -1) {
          tickListeners.splice(index, 1);
        }
      };
    },
    emitVisualStateChange: () => {
      for (const listener of visualStateListeners) {
        listener();
      }
    },
    onVisualStateChange: (callback) => {
      visualStateListeners.push(callback);

      return () => {
        const index = visualStateListeners.findIndex(callback);
        if (index !== -1) {
          visualStateListeners.splice(index, 1);
        }
      };
    },
  };
}

export const GameStateWatcherProvider = GameStateWatcherContext.Provider;
