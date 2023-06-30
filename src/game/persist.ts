import {
  makePersistanceStorageItem,
  makePersistanceParameterizedStorageItem,
} from '../utils/persistentStorage';

import type { GameStateSnapshot } from './gameStatePersist';

export const gameStateStorage =
  makePersistanceParameterizedStorageItem<GameStateSnapshot>('game');

export type GamesListStorageItem = {
  games: {
    gameId: string;
    gameName: string;
    snapshotCreatedAt: number;
  }[];
};

export const gamesListStorage =
  makePersistanceStorageItem<GamesListStorageItem>('gamesList');
