import {
  makePersistanceStorageItem,
  makePersistanceParameterizedStorageItem,
} from '../utils/persistentStorage';

import type { GameStateSnapshot } from './gameStatePersist';

export const gameStateStorage =
  makePersistanceParameterizedStorageItem<GameStateSnapshot>('game');

type GameMeta = {
  gameId: string;
  gameName: string;
  snapshotCreatedAt: number | undefined;
  lastSnapshotCreatedAt: number;
  saves: GameSaveMeta[];
};

type GameSaveMeta = {
  saveName: string;
  snapshotCreatedAt: number;
};

export type GamesListStorageItem = {
  games: GameMeta[];
};

export const gamesListStorage =
  makePersistanceStorageItem<GamesListStorageItem>('gamesList');
