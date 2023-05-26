import { createContext } from 'react';

type GameStateWatcher = {
  tick: () => void;
  onTick: (callback: () => void) => () => void;
};

export const GameStateWatcherContext = createContext<
  GameStateWatcher | undefined
>(undefined);

export function createGameStateWatcher(): GameStateWatcher {
  const listeners: (() => void)[] = [];

  return {
    tick: () => {
      for (const listener of listeners) {
        listener();
      }
    },
    onTick: (callback) => {
      listeners.push(callback);

      return () => {
        const index = listeners.findIndex(callback);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      };
    },
  };
}

export const GameStateWatcherProvider = GameStateWatcherContext.Provider;
